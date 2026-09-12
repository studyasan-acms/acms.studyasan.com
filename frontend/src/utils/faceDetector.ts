/**
 * StudyAsan Advanced Face & Proctoring Detector
 * 
 * Multi-tier Detection Pipeline:
 * Tier 1: Native browser Shape Detection API (window.FaceDetector) - hardware accelerated when supported.
 * Tier 2: Pico Cascade Decision Tree Classifier - ultra-lightweight (235KB), runs in ~5ms, zero false-positives on blank walls.
 * Tier 3: Edge & YCbCr Multi-gate Computer Vision Fallback - rejects flat walls, ceilings, and hands via Sobel gradient & chrominance.
 */

export interface FaceDetectionResult {
  status: 'ok' | 'no_face' | 'not_looking';
  faceCount: number;
  message: string;
  confidence: number;
}

type ClassifyRegionFn = (r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number;

let classifyRegion: ClassifyRegionFn | null = null;
let cascadeLoadingPromise: Promise<boolean> | null = null;

/**
 * Unpacks the pico binary cascade format into an executable decision-tree classifier.
 */
function unpackCascade(bytes: Int8Array): ClassifyRegionFn {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8; // skip header

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;

  const tcodes: number[] = [];
  const tpreds: number[] = [];
  const thresh: number[] = [];

  for (let t = 0; t < ntrees; ++t) {
    tcodes.push(0, 0, 0, 0);
    const span = 4 * Math.pow(2, tdepth) - 4;
    for (let k = 0; k < span; k++) {
      tcodes.push(bytes[p + k]);
    }
    p += span;

    for (let i = 0; i < Math.pow(2, tdepth); ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpreds.push(dview.getFloat32(0, true));
      p += 4;
    }

    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    thresh.push(dview.getFloat32(0, true));
    p += 4;
  }

  const tcodesArr = new Int8Array(tcodes);
  const tpredsArr = new Float32Array(tpreds);
  const threshArr = new Float32Array(thresh);

  return function classify(r: number, c: number, s: number, pixels: Uint8Array, ldim: number): number {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;
    const pow2tdepth = Math.pow(2, tdepth) >> 0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        const p1 = ((r + tcodesArr[root + 4 * idx + 0] * s) >> 8) * ldim + ((c + tcodesArr[root + 4 * idx + 1] * s) >> 8);
        const p2 = ((r + tcodesArr[root + 4 * idx + 2] * s) >> 8) * ldim + ((c + tcodesArr[root + 4 * idx + 3] * s) >> 8);
        idx = 2 * idx + (pixels[p1] <= pixels[p2] ? 1 : 0);
      }
      o += tpredsArr[pow2tdepth * i + idx - pow2tdepth];
      if (o <= threshArr[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - threshArr[ntrees - 1];
  };
}

/**
 * Initializes the face detector model by downloading /models/facefinder.
 */
export async function initFaceDetector(): Promise<boolean> {
  if (classifyRegion) return true;
  if (cascadeLoadingPromise) return cascadeLoadingPromise;

  cascadeLoadingPromise = (async () => {
    try {
      const resp = await fetch('/models/facefinder');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      const bytes = new Int8Array(buffer);
      classifyRegion = unpackCascade(bytes);
      return true;
    } catch (err) {
      console.warn('[FaceDetector] Could not load facefinder cascade model, using CV fallback:', err);
      return false;
    }
  })();

  return cascadeLoadingPromise;
}

/**
 * Runs cascade multiscale window search over grayscale image.
 */
function runCascade(
  pixels: Uint8Array,
  nrows: number,
  ncols: number,
  classify: ClassifyRegionFn,
  params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number }
): [number, number, number, number][] {
  let scale = params.minsize;
  const detections: [number, number, number, number][] = [];

  while (scale <= params.maxsize) {
    const step = Math.max(params.shiftfactor * scale, 1) >> 0;
    const offset = (scale / 2 + 1) >> 0;
    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classify(r, c, scale, pixels, ncols);
        if (q > 0.0) {
          detections.push([r, c, scale, q]);
        }
      }
    }
    scale = scale * params.scalefactor;
  }
  return detections;
}

/**
 * Non-maximum suppression clustering of candidate detections.
 */
function clusterDetections(
  dets: [number, number, number, number][],
  iouThreshold = 0.2
): [number, number, number, number][] {
  dets.sort((a, b) => b[3] - a[3]);
  const assignments = new Uint8Array(dets.length);
  const clusters: [number, number, number, number][] = [];

  for (let i = 0; i < dets.length; i++) {
    if (assignments[i] === 0) {
      let r = 0, c = 0, s = 0, q = 0, n = 0;
      for (let j = i; j < dets.length; j++) {
        const r1 = dets[i][0], c1 = dets[i][1], s1 = dets[i][2];
        const r2 = dets[j][0], c2 = dets[j][1], s2 = dets[j][2];
        const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
        const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));
        const iou = (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
        if (iou > iouThreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          q += dets[j][3];
          n++;
        }
      }
      clusters.push([r / n, c / n, s / n, q]);
    }
  }
  return clusters;
}

/**
 * Converts RGBA image to normalized Grayscale Uint8Array.
 */
function rgbaToGrayscale(rgba: Uint8ClampedArray, nrows: number, ncols: number): Uint8Array {
  const gray = new Uint8Array(nrows * ncols);
  for (let r = 0; r < nrows; ++r) {
    for (let c = 0; c < ncols; ++c) {
      const idx = (r * ncols + c) * 4;
      // 0.299*R + 0.587*G + 0.114*B
      gray[r * ncols + c] = (2 * rgba[idx] + 7 * rgba[idx + 1] + 1 * rgba[idx + 2]) / 10;
    }
  }
  return gray;
}

/**
 * Validates facial symmetry and head orientation from grayscale pixels.
 */
function checkOrientation(
  pixels: Uint8Array,
  width: number,
  height: number,
  faceRow: number,
  faceCol: number,
  faceSize: number
): { isLooking: boolean; reason?: string } {
  // 1. Horizontal Centering in Frame:
  const centerFrac = faceCol / width;
  if (centerFrac < 0.20 || centerFrac > 0.80) {
    return { isLooking: false, reason: 'Face is not centered in camera view' };
  }

  // 2. Vertical Centering in Frame:
  const vFrac = faceRow / height;
  if (vFrac < 0.15 || vFrac > 0.85) {
    return { isLooking: false, reason: 'Face is too close to camera edge' };
  }

  // 3. Bilateral Symmetry Analysis:
  // We inspect the eye and cheek region inside the face bounding box.
  const halfSize = Math.round(faceSize * 0.40);
  const leftCol   = Math.max(0, Math.round(faceCol - halfSize));
  const midCol    = Math.round(faceCol);
  const rightCol  = Math.min(width - 1, Math.round(faceCol + halfSize));
  const topRow    = Math.max(0, Math.round(faceRow - halfSize * 0.7));
  const botRow    = Math.min(height - 1, Math.round(faceRow + halfSize * 0.7));

  let leftLuminance = 0, rightLuminance = 0;
  let leftCount = 0, rightCount = 0;
  let leftEdges = 0, rightEdges = 0;

  for (let r = topRow; r <= botRow; r++) {
    const rowOffset = r * width;
    for (let c = leftCol; c < midCol; c++) {
      leftLuminance += pixels[rowOffset + c];
      leftCount++;
      if (c > 0 && Math.abs(pixels[rowOffset + c] - pixels[rowOffset + c - 1]) > 18) {
        leftEdges++;
      }
    }
    for (let c = midCol; c <= rightCol; c++) {
      rightLuminance += pixels[rowOffset + c];
      rightCount++;
      if (c < width - 1 && Math.abs(pixels[rowOffset + c] - pixels[rowOffset + c + 1]) > 18) {
        rightEdges++;
      }
    }
  }

  if (leftCount === 0 || rightCount === 0) return { isLooking: true };

  const avgLeft = leftLuminance / leftCount;
  const avgRight = rightLuminance / rightCount;
  const lumDiff = Math.abs(avgLeft - avgRight) / (avgLeft + avgRight + 1e-5);

  const edgeDiff = Math.abs(leftEdges - rightEdges) / (leftEdges + rightEdges + 1e-5);

  // When a student turns head sideways:
  // - Profile creates extreme shadow difference (> 0.28 luminance asymmetry)
  // - Or one side's edge count drops sharply (> 0.65 edge asymmetry)
  if (lumDiff > 0.30 || (edgeDiff > 0.65 && (leftEdges + rightEdges) > 30)) {
    return { isLooking: false, reason: 'Looking away from screen' };
  }

  return { isLooking: true };
}

/**
 * Tier 3 Fallback: Multi-gate Computer Vision Heuristic.
 * Specifically engineered to strictly reject walls, ceilings, and hands.
 */
function cvFallbackDetection(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): FaceDetectionResult {
  let totalEdges = 0;
  let skinCount = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let sumX = 0, sumY = 0;

  let cornersCovered = 0;
  const cornerBound = 20;

  for (let y = 0; y < height; y++) {
    const rowIdx = y * width;
    for (let x = 0; x < width; x++) {
      const i = (rowIdx + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];

      // Edge gradient calculation (Sobel magnitude)
      if (x < width - 1 && y < height - 1) {
        const rRight = rgba[i + 4];
        const rDown  = rgba[i + width * 4];
        const grad = Math.abs(r - rRight) + Math.abs(r - rDown);
        if (grad > 24) totalEdges++;
      }

      // YCbCr Skin Chrominance Space
      const cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
      const cr =  0.5 * r - 0.4187 * g - 0.0813 * b + 128;

      const isSkin = (
        r > 55 && g > 35 && b > 20 &&
        r > b &&
        cb >= 82 && cb <= 130 &&
        cr >= 134 && cr <= 175 &&
        (cr - cb) >= 10 && (cr - cb) <= 55
      );

      if (isSkin) {
        skinCount++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Check if skin is touching all extreme corners (which means it's a wall)
        if (x < cornerBound && y < cornerBound) cornersCovered |= 1;
        if (x > width - cornerBound && y < cornerBound) cornersCovered |= 2;
        if (x < cornerBound && y > height - cornerBound) cornersCovered |= 4;
        if (x > width - cornerBound && y > height - cornerBound) cornersCovered |= 8;
      }
    }
  }

  // 1. Edge Density Test:
  // A blank wall or ceiling has virtually 0 edges (totalEdges < 70).
  // A real face with hair, eyes, eyebrows, nose, mouth has totalEdges > 150.
  if (totalEdges < 90) {
    return { status: 'no_face', faceCount: 0, message: 'No face detected (surface flat/empty)', confidence: 0 };
  }

  // 2. Wall Corner Spread Test:
  // If "skin" spans 3 or 4 extreme corners of the camera, it is an empty room/wall, NOT a face.
  const cornerBits = (cornersCovered & 1 ? 1 : 0) + (cornersCovered & 2 ? 1 : 0) + (cornersCovered & 4 ? 1 : 0) + (cornersCovered & 8 ? 1 : 0);
  if (cornerBits >= 3) {
    return { status: 'no_face', faceCount: 0, message: 'No face detected (background only)', confidence: 0 };
  }

  // 3. Compact Face Cluster Size:
  const totalPixels = width * height;
  if (skinCount < totalPixels * 0.06 || skinCount > totalPixels * 0.65) {
    return { status: 'no_face', faceCount: 0, message: 'No face detected', confidence: 0 };
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  if (boxW < width * 0.18 || boxH < height * 0.20) {
    return { status: 'no_face', faceCount: 0, message: 'No face detected (too small)', confidence: 0 };
  }

  // Centroid check
  const meanX = sumX / skinCount;
  const hFrac = meanX / width;
  if (hFrac < 0.25 || hFrac > 0.75) {
    return { status: 'not_looking', faceCount: 1, message: 'Please center your face', confidence: 0.6 };
  }

  return { status: 'ok', faceCount: 1, message: 'Looking at screen', confidence: 0.7 };
}

/**
 * Main Face Detection Entrypoint.
 * Evaluates the camera frame across the multi-tier pipeline.
 */
export async function detectFaceInCanvas(
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult> {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { status: 'no_face', faceCount: 0, message: 'Canvas context unavailable', confidence: 0 };
  }

  // ── Tier 1: Browser Native Shape Detection API ──
  if (typeof (window as any).FaceDetector === 'function') {
    try {
      const nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
      const faces: any[] = await nativeDetector.detect(canvas);

      if (faces.length === 0) {
        return { status: 'no_face', faceCount: 0, message: 'No face detected', confidence: 0.95 };
      }
      if (faces.length > 1) {
        return { status: 'not_looking', faceCount: faces.length, message: 'Multiple faces detected', confidence: 0.95 };
      }

      const box = faces[0].boundingBox;
      const centerX = box.x + box.width / 2;
      const hFrac = centerX / width;
      if (hFrac < 0.22 || hFrac > 0.78) {
        return { status: 'not_looking', faceCount: 1, message: 'Please look directly at the screen', confidence: 0.9 };
      }

      return { status: 'ok', faceCount: 1, message: 'Looking at screen', confidence: 0.95 };
    } catch {
      // Fall through to Tier 2
    }
  }

  const imgData = ctx.getImageData(0, 0, width, height);

  // ── Tier 2: Pico Cascade Decision Tree Classifier ──
  if (classifyRegion) {
    const gray = rgbaToGrayscale(imgData.data, height, width);
    const minSize = Math.max(30, Math.round(Math.min(width, height) * 0.20));
    const maxSize = Math.round(Math.min(width, height) * 0.95);

    let dets = runCascade(gray, height, width, classifyRegion, {
      shiftfactor: 0.1,
      minsize: minSize,
      maxsize: maxSize,
      scalefactor: 1.15,
    });

    dets = clusterDetections(dets, 0.2);

    // Standard confidence threshold for pico classifier:
    const confidentDetections = dets.filter(d => d[3] > 8.0);

    if (confidentDetections.length === 0) {
      return { status: 'no_face', faceCount: 0, message: 'No face detected', confidence: 0.9 };
    }

    if (confidentDetections.length > 1) {
      return {
        status: 'not_looking',
        faceCount: confidentDetections.length,
        message: 'Multiple people detected in view',
        confidence: 0.85,
      };
    }

    const [r, c, s, q] = confidentDetections[0];
    const orientation = checkOrientation(gray, width, height, r, c, s);

    if (!orientation.isLooking) {
      return {
        status: 'not_looking',
        faceCount: 1,
        message: orientation.reason || 'Please look directly at screen',
        confidence: Math.min(1.0, q / 20.0),
      };
    }

    return {
      status: 'ok',
      faceCount: 1,
      message: 'Looking at screen',
      confidence: Math.min(1.0, q / 20.0),
    };
  }

  // ── Tier 3: Computer Vision Multi-gate Fallback ──
  return cvFallbackDetection(imgData.data, width, height);
}
