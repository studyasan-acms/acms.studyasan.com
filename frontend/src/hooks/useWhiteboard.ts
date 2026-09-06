/**
 * useWhiteboard Hook
 * 
 * Canvas drawing state management for the whiteboard feature.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DrawingTool, EraserType, Stroke, Point, WhiteboardMessage } from '@/types/videoRoom';

// Pen thickness range configuration
export const PEN_THICKNESS_RANGE = {
    min: 1,
    max: 32,
    step: 1,
    default: 4,
} as const;

// Predefined quick-select pen thickness options
export const PEN_THICKNESS_PRESETS = [
    { label: 'Thin', value: 2 },
    { label: 'Medium', value: 6 },
    { label: 'Large', value: 12 },
    { label: 'Extra Large', value: 20 },
] as const;

interface UseWhiteboardOptions {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    sendMessage: (message: WhiteboardMessage) => void;
    initialStrokes?: Stroke[] | null;
}

export interface StrokeBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export type WhiteboardHistoryAction =
    | {
          type: 'add';
          stroke: Stroke;
      }
    | {
          type: 'delete';
          strokes: Stroke[];
      }
    | {
          type: 'modify';
          before: Stroke;
          after: Stroke;
      }
    | {
          type: 'replace';
          removed: Stroke[];
          added: Stroke[];
      }
    | {
          type: 'clear';
          strokes: Stroke[];
          board?: number;
      };

interface UseWhiteboardReturn {
    currentTool: DrawingTool;
    currentColor: string;
    currentSize: number;
    currentBoard: number;
    eraserType: EraserType;
    selectedStrokeId: string | null;
    selectedStroke: Stroke | null;
    canUndo: boolean;
    canRedo: boolean;
    redrawCanvas: () => void;
    setTool: (tool: DrawingTool) => void;
    setColor: (color: string) => void;
    setSize: (size: number) => void;
    setBoard: (board: number, broadcast?: boolean) => void;
    setEraserType: (type: EraserType) => void;
    undo: () => void;
    redo: () => void;
    clearCanvas: () => void;
    clearBoard: (board: number) => void;
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: () => void;
    handleRemoteMessage: (message: WhiteboardMessage) => void;
    setActive: (active: boolean) => void;
    addTextStroke: (text: string, position: Point) => void;
    addImageStroke: (imageUrl: string, position: Point) => void;
    addTableStroke: (rows?: number, cols?: number, position?: Point) => void;
    updateTableCell: (strokeId: string, row: number, col: number, text: string) => void;
    addTableRow: (strokeId?: string) => void;
    removeTableRow: (strokeId?: string) => void;
    addTableCol: (strokeId?: string) => void;
    removeTableCol: (strokeId?: string) => void;
    deleteSelected: () => void;
    scaleSelected: (factor: number) => void;
    rotateSelected: (degrees?: number) => void;
    duplicateSelected: () => void;
    bringSelectedToFront: () => void;
    sendSelectedToBack: () => void;
    resetSelectedAspectRatio: () => void;
    getStrokes: () => Stroke[];
    loadStrokes: (loadedStrokes: Stroke[]) => void;
    exportImage: () => string | null;
    getStrokeBoundsForCanvas: (stroke: Stroke) => StrokeBounds | null;
}

function generateStrokeId(): string {
    return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function interpolateColor(color1: string, color2: string, fraction: number): string {
    const hex2rgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    };

    const c1 = hex2rgb(color1);
    const c2 = hex2rgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * fraction);
    const g = Math.round(c1.g + (c2.g - c1.g) * fraction);
    const b = Math.round(c1.b + (c2.b - c1.b) * fraction);

    return `rgb(${r}, ${g}, ${b})`;
}

function distSqToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }): number {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
}

export function getStrokeBounds(stroke: Stroke, rect: DOMRect): StrokeBounds {
    if (!stroke.points || stroke.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    if (stroke.tool === 'image' || stroke.tool === 'table') {
        const p0 = stroke.points[0];
        const p1 = stroke.points[1] || { x: p0.x + 0.3, y: p0.y + 0.2 };
        const minX = Math.min(p0.x, p1.x) * rect.width;
        const maxX = Math.max(p0.x, p1.x) * rect.width;
        const minY = Math.min(p0.y, p1.y) * rect.height;
        const maxY = Math.max(p0.y, p1.y) * rect.height;
        return { minX, minY, maxX, maxY, width: Math.max(maxX - minX, 10), height: Math.max(maxY - minY, 10) };
    }

    if (stroke.tool === 'text' && stroke.text) {
        const x = stroke.points[0].x * rect.width;
        const y = stroke.points[0].y * rect.height;
        const fontSize = (stroke.size || 4) * 4;
        const textWidth = Math.max(stroke.text.length * (fontSize * 0.6), 24);
        return {
            minX: x - 4,
            minY: y - fontSize - 4,
            maxX: x + textWidth + 4,
            maxY: y + 8,
            width: textWidth + 8,
            height: fontSize + 12,
        };
    }

    // Shapes & freehand strokes
    let minX = stroke.points[0].x * rect.width;
    let maxX = stroke.points[0].x * rect.width;
    let minY = stroke.points[0].y * rect.height;
    let maxY = stroke.points[0].y * rect.height;

    for (const p of stroke.points) {
        const px = p.x * rect.width;
        const py = p.y * rect.height;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
    }

    const padding = Math.max((stroke.size || 4) / 2, 4);
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    return { minX, minY, maxX, maxY, width: Math.max(maxX - minX, 10), height: Math.max(maxY - minY, 10) };
}

function interpolateSegment(p1: Point, p2: Point, steps: number): Point[] {
    const pts: Point[] = [];
    const count = Math.max(steps, 1);
    for (let i = 0; i <= count; i++) {
        const t = i / count;
        pts.push({
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y),
        });
    }
    return pts;
}

export function getStrokeOutlinePoints(stroke: Stroke): Point[] {
    if (!stroke.points || stroke.points.length === 0) return [];

    if (['pen', 'rainbow', 'highlight'].includes(stroke.tool)) {
        return stroke.points;
    }

    if (['line', 'arrow'].includes(stroke.tool)) {
        if (stroke.points.length < 2) return stroke.points;
        return interpolateSegment(stroke.points[0], stroke.points[1], 16);
    }

    if (stroke.tool === 'rect' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const p1 = stroke.points[1];
        const minX = Math.min(p0.x, p1.x);
        const maxX = Math.max(p0.x, p1.x);
        const minY = Math.min(p0.y, p1.y);
        const maxY = Math.max(p0.y, p1.y);

        const tl = { x: minX, y: minY };
        const tr = { x: maxX, y: minY };
        const br = { x: maxX, y: maxY };
        const bl = { x: minX, y: maxY };

        const top = interpolateSegment(tl, tr, 12);
        const right = interpolateSegment(tr, br, 12);
        const bottom = interpolateSegment(br, bl, 12);
        const left = interpolateSegment(bl, tl, 12);

        return [...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1)];
    }

    if (stroke.tool === 'triangle' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const p1 = stroke.points[1];
        const minX = Math.min(p0.x, p1.x);
        const maxX = Math.max(p0.x, p1.x);
        const minY = Math.min(p0.y, p1.y);
        const maxY = Math.max(p0.y, p1.y);
        const topMid = { x: (minX + maxX) / 2, y: minY };
        const br = { x: maxX, y: maxY };
        const bl = { x: minX, y: maxY };

        const e1 = interpolateSegment(topMid, br, 14);
        const e2 = interpolateSegment(br, bl, 14);
        const e3 = interpolateSegment(bl, topMid, 14);

        return [...e1, ...e2.slice(1), ...e3.slice(1)];
    }

    if (stroke.tool === 'circle' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const p1 = stroke.points[1];
        const cx = (p0.x + p1.x) / 2;
        const cy = (p0.y + p1.y) / 2;
        const rx = Math.abs(p1.x - p0.x) / 2;
        const ry = Math.abs(p1.y - p0.y) / 2;

        const pts: Point[] = [];
        const steps = 48;
        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * Math.PI * 2;
            pts.push({
                x: cx + rx * Math.cos(theta),
                y: cy + ry * Math.sin(theta),
            });
        }
        return pts;
    }

    if (stroke.tool === 'star' && stroke.points.length >= 2) {
        const p0 = stroke.points[0];
        const p1 = stroke.points[1];
        const cx = (p0.x + p1.x) / 2;
        const cy = (p0.y + p1.y) / 2;
        const outerR = Math.abs(p1.x - p0.x) / 2;
        const innerR = outerR / 2;

        const vertices: Point[] = [];
        const spikes = 5;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        for (let i = 0; i < spikes; i++) {
            vertices.push({
                x: cx + Math.cos(rot) * outerR,
                y: cy + Math.sin(rot) * outerR,
            });
            rot += step;
            vertices.push({
                x: cx + Math.cos(rot) * innerR,
                y: cy + Math.sin(rot) * innerR,
            });
            rot += step;
        }
        vertices.push(vertices[0]);

        const pts: Point[] = [];
        for (let i = 0; i < vertices.length - 1; i++) {
            const edge = interpolateSegment(vertices[i], vertices[i + 1], 6);
            if (i === 0) {
                pts.push(...edge);
            } else {
                pts.push(...edge.slice(1));
            }
        }
        return pts;
    }

    return stroke.points;
}

function isStrokeIntersecting(
    stroke: Stroke,
    eraserX: number,
    eraserY: number,
    eraserRadius: number,
    rect: DOMRect,
    eraserType: 'object' | 'pixel' = 'pixel'
): boolean {
    if (!stroke.points || stroke.points.length === 0) return false;

    const eraserPt = { x: eraserX, y: eraserY };
    const strokeSize = stroke.size || 4;
    const thresholdSq = (eraserRadius + strokeSize / 2) * (eraserRadius + strokeSize / 2);

    // Freehand strokes & lines/arrows & vector shapes
    if (['pen', 'rainbow', 'highlight', 'line', 'arrow', 'rect', 'circle', 'triangle', 'star'].includes(stroke.tool)) {
        if (eraserType === 'object' && ['rect', 'circle', 'triangle', 'star'].includes(stroke.tool)) {
            const bounds = getStrokeBounds(stroke, rect);
            return (
                eraserX >= bounds.minX - eraserRadius &&
                eraserX <= bounds.maxX + eraserRadius &&
                eraserY >= bounds.minY - eraserRadius &&
                eraserY <= bounds.maxY + eraserRadius
            );
        }

        const outlinePoints = getStrokeOutlinePoints(stroke);
        for (let i = 0; i < outlinePoints.length; i++) {
            const pA = {
                x: outlinePoints[i].x * rect.width,
                y: outlinePoints[i].y * rect.height,
            };
            const dx = pA.x - eraserX;
            const dy = pA.y - eraserY;
            if (dx * dx + dy * dy <= thresholdSq) {
                return true;
            }

            if (i < outlinePoints.length - 1) {
                const pB = {
                    x: outlinePoints[i + 1].x * rect.width,
                    y: outlinePoints[i + 1].y * rect.height,
                };
                if (distSqToSegment(eraserPt, pA, pB) <= thresholdSq) {
                    return true;
                }
            }
        }
        return false;
    }

    if (stroke.tool === 'text' && stroke.text && stroke.points.length >= 1) {
        const x = stroke.points[0].x * rect.width;
        const y = stroke.points[0].y * rect.height;
        const textHeight = strokeSize * 4;
        const textWidth = Math.max(stroke.text.length * (textHeight * 0.6), 20);
        return (
            eraserX >= x - 4 - eraserRadius &&
            eraserX <= x + textWidth + 4 + eraserRadius &&
            eraserY >= y - textHeight - eraserRadius &&
            eraserY <= y + 8 + eraserRadius
        );
    }

    if ((stroke.tool === 'image' || stroke.tool === 'table') && stroke.points.length >= 1) {
        const bounds = getStrokeBounds(stroke, rect);
        return (
            eraserX >= bounds.minX - eraserRadius &&
            eraserX <= bounds.maxX + eraserRadius &&
            eraserY >= bounds.minY - eraserRadius &&
            eraserY <= bounds.maxY + eraserRadius
        );
    }

    return false;
}

/**
 * Pixel Eraser: Cuts intersecting segments out of vector strokes & shapes,
 * splitting them cleanly into remaining sub-strokes without deleting entire objects.
 * Returns null if untouched, empty array if completely erased, or array of sub-strokes if split.
 */
function splitStrokeByEraser(
    stroke: Stroke,
    eraserX: number,
    eraserY: number,
    eraserRadius: number,
    rect: DOMRect
): Stroke[] | null {
    if (!stroke.points || stroke.points.length === 0) return null;

    if (!isStrokeIntersecting(stroke, eraserX, eraserY, eraserRadius, rect, 'pixel')) {
        return null;
    }

    // For non-vector objects (text, image, table), delete entire object when directly hit
    if (['text', 'image', 'table'].includes(stroke.tool)) {
        return [];
    }

    const strokeSize = stroke.size || 4;
    const effectiveRadius = eraserRadius + strokeSize / 2;
    const effectiveRadiusSq = effectiveRadius * effectiveRadius;

    const rawPoints = getStrokeOutlinePoints(stroke);
    if (!rawPoints || rawPoints.length === 0) return [];

    if (rawPoints.length === 1) {
        const dx = rawPoints[0].x * rect.width - eraserX;
        const dy = rawPoints[0].y * rect.height - eraserY;
        return (dx * dx + dy * dy <= effectiveRadiusSq) ? [] : null;
    }

    const segments: Point[][] = [];
    let currentSegment: Point[] = [];

    for (let i = 0; i < rawPoints.length - 1; i++) {
        const pA = rawPoints[i];
        const pB = rawPoints[i + 1];

        const pAx = pA.x * rect.width;
        const pAy = pA.y * rect.height;
        const pBx = pB.x * rect.width;
        const pBy = pB.y * rect.height;

        const dx = pBx - pAx;
        const dy = pBy - pAy;
        const vx = pAx - eraserX;
        const vy = pAy - eraserY;

        const a = dx * dx + dy * dy;
        const b = 2 * (vx * dx + vy * dy);
        const c = vx * vx + vy * vy - effectiveRadiusSq;

        if (a < 1e-8) {
            if (c > 0) {
                if (currentSegment.length === 0) currentSegment.push(pA);
            } else {
                if (currentSegment.length >= 2) segments.push(currentSegment);
                currentSegment = [];
            }
            continue;
        }

        const disc = b * b - 4 * a * c;
        let inStart = 1;
        let inEnd = 0;

        if (disc <= 0) {
            if (c < 0) {
                inStart = 0;
                inEnd = 1;
            } else {
                inStart = 1;
                inEnd = 0;
            }
        } else {
            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b - sqrtDisc) / (2 * a);
            const t2 = (-b + sqrtDisc) / (2 * a);
            inStart = Math.max(0, Math.min(1, t1));
            inEnd = Math.max(0, Math.min(1, t2));
        }

        if (inStart >= inEnd || inEnd - inStart < 1e-4) {
            // Entire segment is outside eraser
            if (currentSegment.length === 0) {
                currentSegment.push(pA);
            }
            currentSegment.push(pB);
        } else if (inStart <= 1e-4 && inEnd >= 1 - 1e-4) {
            // Entire segment is inside eraser
            if (currentSegment.length >= 2) {
                segments.push(currentSegment);
            }
            currentSegment = [];
        } else if (inStart > 1e-4 && inEnd >= 1 - 1e-4) {
            // Enters circle and remains inside at pB
            if (currentSegment.length === 0) {
                currentSegment.push(pA);
            }
            const enterPt: Point = {
                x: pA.x + inStart * (pB.x - pA.x),
                y: pA.y + inStart * (pB.y - pA.y),
            };
            currentSegment.push(enterPt);
            if (currentSegment.length >= 2) {
                segments.push(currentSegment);
            }
            currentSegment = [];
        } else if (inStart <= 1e-4 && inEnd < 1 - 1e-4) {
            // Starts inside circle at pA and exits before pB
            const exitPt: Point = {
                x: pA.x + inEnd * (pB.x - pA.x),
                y: pA.y + inEnd * (pB.y - pA.y),
            };
            currentSegment = [exitPt, pB];
        } else {
            // Starts outside, enters circle, exits circle, ends outside
            if (currentSegment.length === 0) {
                currentSegment.push(pA);
            }
            const enterPt: Point = {
                x: pA.x + inStart * (pB.x - pA.x),
                y: pA.y + inStart * (pB.y - pA.y),
            };
            currentSegment.push(enterPt);
            if (currentSegment.length >= 2) {
                segments.push(currentSegment);
            }
            const exitPt: Point = {
                x: pA.x + inEnd * (pB.x - pA.x),
                y: pA.y + inEnd * (pB.y - pA.y),
            };
            currentSegment = [exitPt, pB];
        }
    }

    if (currentSegment.length >= 2) {
        segments.push(currentSegment);
    }

    const convertedTool: DrawingTool = ['rect', 'circle', 'triangle', 'star', 'arrow'].includes(stroke.tool)
        ? 'pen'
        : stroke.tool;

    const newStrokes: Stroke[] = segments
        .filter(seg => seg.length >= 2)
        .map((segPoints, idx) => ({
            ...stroke,
            tool: convertedTool,
            id: `${stroke.id}_p${Date.now().toString(36)}_${idx}`,
            points: segPoints,
            timestamp: Date.now(),
        }));

    return newStrokes;
}

export function hydrateStroke(stroke: Stroke): Stroke {
    if (stroke.tool === 'table' && stroke.text && (!stroke.tableRows || !stroke.tableData)) {
        try {
            const parsed = JSON.parse(stroke.text);
            if (parsed.rows) stroke.tableRows = parsed.rows;
            if (parsed.cols) stroke.tableCols = parsed.cols;
            if (parsed.data) stroke.tableData = parsed.data;
        } catch {}
    }
    return stroke;
}

function drawTable(ctx: CanvasRenderingContext2D, stroke: Stroke, rect: DOMRect) {
    const bounds = getStrokeBounds(stroke, rect);
    const minX = bounds.minX;
    const minY = bounds.minY;
    const width = bounds.width;
    const height = bounds.height;

    const rows = Math.max(1, stroke.tableRows || 3);
    const cols = Math.max(1, stroke.tableCols || 3);
    const rowH = height / rows;
    const colW = width / cols;

    // 1. Table White Canvas Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(minX, minY, width, height);

    // 2. Header Row Accent Background (row 0)
    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)'; // Soft Slate-100 accent
    ctx.fillRect(minX, minY, width, rowH);

    // 3. Grid Lines
    const tableColor = stroke.color === '#ffffff' ? '#1e293b' : (stroke.color || '#334155');
    const baseLineWidth = Math.max(1.5, stroke.size || 2);

    ctx.strokeStyle = tableColor;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    // Outer border
    ctx.lineWidth = baseLineWidth;
    ctx.strokeRect(minX, minY, width, height);

    // Horizontal dividers
    for (let r = 1; r < rows; r++) {
        const y = minY + r * rowH;
        ctx.beginPath();
        // Slightly distinct line below header
        if (r === 1) {
            ctx.lineWidth = Math.max(2, baseLineWidth);
        } else {
            ctx.lineWidth = Math.max(1, Math.round(baseLineWidth * 0.75));
        }
        ctx.moveTo(minX, y);
        ctx.lineTo(minX + width, y);
        ctx.stroke();
    }

    // Vertical dividers
    ctx.lineWidth = Math.max(1, Math.round(baseLineWidth * 0.75));
    for (let c = 1; c < cols; c++) {
        const x = minX + c * colW;
        ctx.beginPath();
        ctx.moveTo(x, minY);
        ctx.lineTo(x, minY + height);
        ctx.stroke();
    }

    // 4. Cell Text Content
    const tableData = stroke.tableData;
    const fontSize = Math.min(Math.max(11, Math.round(rowH * 0.38)), 20);

    for (let r = 0; r < rows; r++) {
        const isHeader = r === 0;
        ctx.font = isHeader
            ? `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
            : `${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isHeader ? '#0f172a' : '#1e293b';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        for (let c = 0; c < cols; c++) {
            const cellText = tableData?.[r]?.[c] || '';
            if (cellText) {
                const cellX = minX + c * colW + 8;
                const cellY = minY + r * rowH + rowH / 2;

                ctx.save();
                ctx.beginPath();
                ctx.rect(minX + c * colW + 2, minY + r * rowH + 2, Math.max(colW - 4, 1), Math.max(rowH - 4, 1));
                ctx.clip();
                ctx.fillText(cellText, cellX, cellY);
                ctx.restore();
            }
        }
    }
}

export function useWhiteboard({ canvasRef, sendMessage, initialStrokes }: UseWhiteboardOptions): UseWhiteboardReturn {
    const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
    const [currentColor, setCurrentColor] = useState('#0ea5e9');
    const [currentSize, setCurrentSize] = useState(4);
    const [currentBoard, setCurrentBoard] = useState(1);
    const currentBoardRef = useRef(1);
    currentBoardRef.current = currentBoard;
    const [eraserType, setEraserType] = useState<EraserType>('pixel');
    const [isActive, setIsActive] = useState(false);
    const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

    // Undo / Redo history stacks
    const undoStack = useRef<WhiteboardHistoryAction[]>([]);
    const redoStack = useRef<WhiteboardHistoryAction[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const eraserSessionRef = useRef<{ removed: Map<string, Stroke>; added: Map<string, Stroke> } | null>(null);
    const dragStartStrokeSnapshot = useRef<Stroke | null>(null);

    const updateUndoRedoState = useCallback(() => {
        setCanUndo(undoStack.current.length > 0);
        setCanRedo(redoStack.current.length > 0);
    }, []);

    const pushHistory = useCallback((action: WhiteboardHistoryAction) => {
        undoStack.current.push(action);
        if (undoStack.current.length > 80) {
            undoStack.current.shift();
        }
        redoStack.current = [];
        updateUndoRedoState();
    }, [updateUndoRedoState]);

    const strokes = useRef<Map<string, Stroke>>(new Map());
    const currentStroke = useRef<Stroke | null>(null);
    const isDrawing = useRef(false);
    const shapeStartPoint = useRef<Point | null>(null);
    const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
    const isDragging = useRef(false);
    const dragStartPoint = useRef<Point | null>(null);
    const dragStartStrokePoints = useRef<Point[]>([]);
    const resizeHandle = useRef<'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | null>(null);
    const resizeStartPoint = useRef<Point | null>(null);
    const resizeStartBounds = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
    const resizeStartStrokePoints = useRef<Point[]>([]);

    // VIBGYOR rainbow colors
    const rainbowColors = [
        '#8B00FF', // Violet
        '#4B0082', // Indigo
        '#0000FF', // Blue
        '#00FF00', // Green
        '#FFFF00', // Yellow
        '#FF7F00', // Orange
        '#FF0000', // Red
    ];

    const getCanvasPoint = useCallback((e: React.PointerEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        };
    }, [canvasRef]);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const activeBoard = currentBoardRef.current;

        // Ensure canvas transform matches device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear and fill white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw all strokes strictly for the current active board (default board is 1)
        strokes.current.forEach((stroke) => {
            const strokeBoard = stroke.board || 1;
            if (strokeBoard !== activeBoard) {
                return;
            }

            ctx.save();

            if (stroke.tool === 'text' && stroke.text) {
                const x = stroke.points[0].x * rect.width;
                const y = stroke.points[0].y * rect.height;
                ctx.font = `${stroke.size * 4}px Arial`;
                ctx.fillStyle = stroke.color;
                ctx.fillText(stroke.text, x, y);
            } else if (stroke.tool === 'image' && stroke.imageUrl) {
                let img = loadedImages.current.get(stroke.imageUrl);
                if (!img) {
                    img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => redrawCanvas();
                    img.onerror = (e) => console.warn('[useWhiteboard] Error loading image stroke:', e);
                    img.src = stroke.imageUrl;
                    loadedImages.current.set(stroke.imageUrl, img);
                }
                if (img.complete && img.naturalWidth > 0) {
                    const bounds = getStrokeBounds(stroke, rect);
                    ctx.drawImage(img, bounds.minX, bounds.minY, bounds.width, bounds.height);
                }
            } else if (stroke.tool === 'table') {
                drawTable(ctx, stroke, rect);
            } else if (stroke.tool === 'highlight') {
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.size * 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (stroke.points.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height);
                    stroke.points.forEach(p => {
                        ctx.lineTo(p.x * rect.width, p.y * rect.height);
                    });
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else if (['rect', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(stroke.tool)) {
                drawShape(ctx, stroke, rect);
            } else {
                if (stroke.tool === 'rainbow' && stroke.points.length > 1) {
                    ctx.lineWidth = stroke.size;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    const totalPoints = stroke.points.length;
                    for (let i = 0; i < totalPoints - 1; i++) {
                        const progress = i / Math.max(totalPoints - 1, 1);
                        const colorIndex = progress * (rainbowColors.length - 1);
                        const lowerIndex = Math.floor(colorIndex);
                        const upperIndex = Math.min(lowerIndex + 1, rainbowColors.length - 1);
                        const fraction = colorIndex - lowerIndex;

                        const color1 = rainbowColors[lowerIndex];
                        const color2 = rainbowColors[upperIndex];
                        ctx.strokeStyle = interpolateColor(color1, color2, fraction);

                        ctx.beginPath();
                        ctx.moveTo(stroke.points[i].x * rect.width, stroke.points[i].y * rect.height);
                        ctx.lineTo(stroke.points[i + 1].x * rect.width, stroke.points[i + 1].y * rect.height);
                        ctx.stroke();
                    }
                } else {
                    if (stroke.tool === 'eraser') {
                        ctx.restore();
                        return;
                    }
                    
                    ctx.strokeStyle = stroke.color;
                    ctx.lineWidth = stroke.size;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    if (stroke.points.length > 0) {
                        ctx.beginPath();
                        ctx.moveTo(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height);
                        stroke.points.forEach(p => {
                            ctx.lineTo(p.x * rect.width, p.y * rect.height);
                        });
                        ctx.stroke();
                    }
                }
            }

            ctx.restore();
        });

        // Draw unified selection bounding box and resize handles on top
        if (selectedStrokeId) {
            const selectedStroke = strokes.current.get(selectedStrokeId);
            const strokeBoard = selectedStroke ? (selectedStroke.board || 1) : 1;
            if (selectedStroke && strokeBoard === activeBoard) {
                const bounds = getStrokeBounds(selectedStroke, rect);

                ctx.save();
                
                // Outer subtle glow & dashed border
                ctx.strokeStyle = '#0284c7';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(bounds.minX - 1, bounds.minY - 1, bounds.width + 2, bounds.height + 2);

                // Quick Delete Badge (Top-Right red circular button)
                const deleteBadgeX = bounds.maxX + 12;
                const deleteBadgeY = bounds.minY - 12;
                ctx.setLineDash([]);
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(deleteBadgeX, deleteBadgeY, 10, 0, Math.PI * 2);
                ctx.fill();

                // Delete 'X' inside badge
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(deleteBadgeX - 3.5, deleteBadgeY - 3.5);
                ctx.lineTo(deleteBadgeX + 3.5, deleteBadgeY + 3.5);
                ctx.moveTo(deleteBadgeX + 3.5, deleteBadgeY - 3.5);
                ctx.lineTo(deleteBadgeX - 3.5, deleteBadgeY + 3.5);
                ctx.stroke();

                // Draw handles for resizable strokes
                if (['image', 'rect', 'circle', 'triangle', 'star', 'line', 'arrow', 'text', 'table'].includes(selectedStroke.tool)) {
                    const cornerHandles = [
                        { name: 'tl', x: bounds.minX, y: bounds.minY },
                        { name: 'tr', x: bounds.maxX, y: bounds.minY },
                        { name: 'bl', x: bounds.minX, y: bounds.maxY },
                        { name: 'br', x: bounds.maxX, y: bounds.maxY },
                    ];
                    const edgeHandles = [
                        { name: 't', x: bounds.minX + bounds.width / 2, y: bounds.minY },
                        { name: 'b', x: bounds.minX + bounds.width / 2, y: bounds.maxY },
                        { name: 'l', x: bounds.minX, y: bounds.minY + bounds.height / 2 },
                        { name: 'r', x: bounds.maxX, y: bounds.minY + bounds.height / 2 },
                    ];

                    // Draw corner handles
                    const cRadius = 5.5;
                    for (const ch of cornerHandles) {
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#0284c7';
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.arc(ch.x, ch.y, cRadius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }

                    // Draw edge handles
                    const eSize = 7;
                    for (const eh of edgeHandles) {
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#0284c7';
                        ctx.lineWidth = 2;
                        ctx.fillRect(eh.x - eSize / 2, eh.y - eSize / 2, eSize, eSize);
                        ctx.strokeRect(eh.x - eSize / 2, eh.y - eSize / 2, eSize, eSize);
                    }
                }
                ctx.restore();
            }
        }
    }, [canvasRef, selectedStrokeId, currentBoard]);

    const drawShape = useCallback((
        ctx: CanvasRenderingContext2D,
        stroke: Stroke,
        rect: DOMRect
    ) => {
        if (stroke.points.length < 2) return;

        const start = {
            x: stroke.points[0].x * rect.width,
            y: stroke.points[0].y * rect.height,
        };
        const end = {
            x: stroke.points[1].x * rect.width,
            y: stroke.points[1].y * rect.height,
        };

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        switch (stroke.tool) {
            case 'rect':
                ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
                break;
            case 'circle':
                const radiusX = Math.abs(end.x - start.x) / 2;
                const radiusY = Math.abs(end.y - start.y) / 2;
                const centerX = start.x + (end.x - start.x) / 2;
                const centerY = start.y + (end.y - start.y) / 2;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                break;
            case 'line':
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                break;
            case 'arrow':
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                const headLen = 15;
                ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(end.x, end.y);
                ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
                break;
            case 'triangle':
                const midX = (start.x + end.x) / 2;
                ctx.moveTo(midX, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.lineTo(start.x, end.y);
                ctx.closePath();
                break;
            case 'star':
                drawStar(ctx, (start.x + end.x) / 2, (start.y + end.y) / 2, 5, Math.abs(end.x - start.x) / 2, Math.abs(end.x - start.x) / 4);
                break;
        }
        ctx.stroke();
    }, []);

    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    };

    const undo = useCallback(() => {
        if (undoStack.current.length === 0) return;
        const action = undoStack.current.pop()!;
        redoStack.current.push(action);

        switch (action.type) {
            case 'add': {
                strokes.current.delete(action.stroke.id);
                if (selectedStrokeId === action.stroke.id) {
                    setSelectedStrokeId(null);
                }
                sendMessage({
                    type: 'delete-strokes',
                    strokeIds: [action.stroke.id],
                    timestamp: Date.now(),
                });
                break;
            }
            case 'delete': {
                for (const s of action.strokes) {
                    strokes.current.set(s.id, s);
                    sendMessage({
                        type: 'stroke',
                        data: s,
                        timestamp: Date.now(),
                    });
                }
                break;
            }
            case 'modify': {
                strokes.current.set(action.before.id, action.before);
                sendMessage({
                    type: 'stroke',
                    data: action.before,
                    timestamp: Date.now(),
                });
                break;
            }
            case 'replace': {
                const addedIds = action.added.map(s => s.id);
                if (addedIds.length > 0) {
                    addedIds.forEach(id => strokes.current.delete(id));
                    sendMessage({
                        type: 'delete-strokes',
                        strokeIds: addedIds,
                        timestamp: Date.now(),
                    });
                }
                for (const s of action.removed) {
                    strokes.current.set(s.id, s);
                    sendMessage({
                        type: 'stroke',
                        data: s,
                        timestamp: Date.now(),
                    });
                }
                break;
            }
            case 'clear': {
                for (const s of action.strokes) {
                    strokes.current.set(s.id, s);
                    sendMessage({
                        type: 'stroke',
                        data: s,
                        timestamp: Date.now(),
                    });
                }
                break;
            }
        }

        updateUndoRedoState();
        redrawCanvas();
    }, [selectedStrokeId, sendMessage, redrawCanvas, updateUndoRedoState]);

    const redo = useCallback(() => {
        if (redoStack.current.length === 0) return;
        const action = redoStack.current.pop()!;
        undoStack.current.push(action);

        switch (action.type) {
            case 'add': {
                strokes.current.set(action.stroke.id, action.stroke);
                sendMessage({
                    type: 'stroke',
                    data: action.stroke,
                    timestamp: Date.now(),
                });
                break;
            }
            case 'delete': {
                const ids = action.strokes.map(s => s.id);
                ids.forEach(id => strokes.current.delete(id));
                if (selectedStrokeId && ids.includes(selectedStrokeId)) {
                    setSelectedStrokeId(null);
                }
                sendMessage({
                    type: 'delete-strokes',
                    strokeIds: ids,
                    timestamp: Date.now(),
                });
                break;
            }
            case 'modify': {
                strokes.current.set(action.after.id, action.after);
                sendMessage({
                    type: 'stroke',
                    data: action.after,
                    timestamp: Date.now(),
                });
                break;
            }
            case 'replace': {
                const removedIds = action.removed.map(s => s.id);
                if (removedIds.length > 0) {
                    removedIds.forEach(id => strokes.current.delete(id));
                    sendMessage({
                        type: 'delete-strokes',
                        strokeIds: removedIds,
                        timestamp: Date.now(),
                    });
                }
                for (const s of action.added) {
                    strokes.current.set(s.id, s);
                    sendMessage({
                        type: 'stroke',
                        data: s,
                        timestamp: Date.now(),
                    });
                }
                break;
            }
            case 'clear': {
                if (action.board !== undefined) {
                    for (const s of action.strokes) {
                        strokes.current.delete(s.id);
                    }
                    sendMessage({
                        type: 'clear-board',
                        board: action.board,
                        timestamp: Date.now(),
                    });
                } else {
                    strokes.current.clear();
                    sendMessage({
                        type: 'clear',
                        timestamp: Date.now(),
                    });
                }
                break;
            }
        }

        updateUndoRedoState();
        redrawCanvas();
    }, [selectedStrokeId, sendMessage, redrawCanvas, updateUndoRedoState]);

    const eraseStrokesAtPoint = useCallback((point: Point) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const eraserX = point.x * rect.width;
        const eraserY = point.y * rect.height;
        const eraserRadius = Math.max(currentSize * 2, 12);

        const strokesArray = Array.from(strokes.current.entries());
        const activeBoard = currentBoardRef.current;

        if (eraserType === 'object') {
            const strokesIdsToDelete: string[] = [];
            for (const [strokeId, stroke] of strokesArray) {
                const strokeBoard = stroke.board || 1;
                if (strokeBoard !== activeBoard) {
                    continue;
                }

                if (isStrokeIntersecting(stroke, eraserX, eraserY, eraserRadius, rect, 'object')) {
                    strokesIdsToDelete.push(strokeId);
                    if (eraserSessionRef.current) {
                        if (eraserSessionRef.current.added.has(strokeId)) {
                            eraserSessionRef.current.added.delete(strokeId);
                        } else if (!eraserSessionRef.current.removed.has(strokeId)) {
                            eraserSessionRef.current.removed.set(strokeId, stroke);
                        }
                    }
                }
            }

            if (strokesIdsToDelete.length > 0) {
                for (const strokeId of strokesIdsToDelete) {
                    strokes.current.delete(strokeId);
                }
                if (selectedStrokeId && strokesIdsToDelete.includes(selectedStrokeId)) {
                    setSelectedStrokeId(null);
                }
                redrawCanvas();
                sendMessage({
                    type: 'delete-strokes',
                    strokeIds: strokesIdsToDelete,
                    timestamp: Date.now(),
                });
            }
        } else {
            // PIXEL ERASER (Precision stroke trimming)
            const idsToDelete: string[] = [];
            const strokesToAdd: Stroke[] = [];

            for (const [strokeId, stroke] of strokesArray) {
                const strokeBoard = stroke.board || 1;
                if (strokeBoard !== activeBoard) {
                    continue;
                }

                const splitResult = splitStrokeByEraser(stroke, eraserX, eraserY, eraserRadius, rect);
                if (splitResult !== null) {
                    idsToDelete.push(strokeId);
                    strokesToAdd.push(...splitResult);

                    if (eraserSessionRef.current) {
                        if (eraserSessionRef.current.added.has(strokeId)) {
                            eraserSessionRef.current.added.delete(strokeId);
                        } else if (!eraserSessionRef.current.removed.has(strokeId)) {
                            eraserSessionRef.current.removed.set(strokeId, stroke);
                        }
                    }
                }
            }

            if (idsToDelete.length > 0) {
                for (const id of idsToDelete) {
                    strokes.current.delete(id);
                }
                for (const newStroke of strokesToAdd) {
                    strokes.current.set(newStroke.id, newStroke);
                    if (eraserSessionRef.current) {
                        eraserSessionRef.current.added.set(newStroke.id, newStroke);
                    }
                }

                if (selectedStrokeId && idsToDelete.includes(selectedStrokeId)) {
                    setSelectedStrokeId(null);
                }

                redrawCanvas();

                sendMessage({
                    type: 'delete-strokes',
                    strokeIds: idsToDelete,
                    timestamp: Date.now(),
                });
                for (const newStroke of strokesToAdd) {
                    sendMessage({
                        type: 'stroke',
                        data: newStroke,
                        timestamp: Date.now(),
                    });
                }
            }
        }
    }, [canvasRef, currentSize, eraserType, redrawCanvas, selectedStrokeId, sendMessage]);

    const deleteSelected = useCallback(() => {
        if (selectedStrokeId) {
            const strokeToDelete = strokes.current.get(selectedStrokeId);
            if (strokeToDelete) {
                pushHistory({
                    type: 'delete',
                    strokes: [{ ...strokeToDelete }],
                });
            }
            const idToDelete = selectedStrokeId;
            strokes.current.delete(idToDelete);
            setSelectedStrokeId(null);
            redrawCanvas();
            sendMessage({
                type: 'delete-strokes',
                strokeIds: [idToDelete],
                timestamp: Date.now(),
            });
        }
    }, [selectedStrokeId, redrawCanvas, sendMessage, pushHistory]);

    const scaleSelected = useCallback((scaleFactor: number) => {
        if (!selectedStrokeId) return;
        const stroke = strokes.current.get(selectedStrokeId);
        if (!stroke) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const bounds = getStrokeBounds(stroke, rect);
        const cx = bounds.minX + bounds.width / 2;
        const cy = bounds.minY + bounds.height / 2;

        const newWidth = Math.max(bounds.width * scaleFactor, 24);
        const newHeight = Math.max(bounds.height * scaleFactor, 24);

        const newMinX = cx - newWidth / 2;
        const newMaxX = cx + newWidth / 2;
        const newMinY = cy - newHeight / 2;
        const newMaxY = cy + newHeight / 2;

        if (['image', 'rect', 'circle', 'triangle', 'star', 'table'].includes(stroke.tool)) {
            stroke.points = [
                { x: newMinX / rect.width, y: newMinY / rect.height },
                { x: newMaxX / rect.width, y: newMaxY / rect.height },
            ];
        } else if (['line', 'arrow'].includes(stroke.tool) && stroke.points.length >= 2) {
            stroke.points = stroke.points.map(p => ({
                x: (cx + (p.x * rect.width - cx) * scaleFactor) / rect.width,
                y: (cy + (p.y * rect.height - cy) * scaleFactor) / rect.height,
            }));
        } else if (stroke.tool === 'text') {
            stroke.size = Math.max(1, Math.round((stroke.size || 4) * scaleFactor));
        }

        strokes.current.set(selectedStrokeId, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, canvasRef, redrawCanvas, sendMessage, pushHistory]);

    const rotateSelected = useCallback((degrees: number = 90) => {
        if (!selectedStrokeId) return;
        const stroke = strokes.current.get(selectedStrokeId);
        if (!stroke) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        stroke.rotation = ((stroke.rotation || 0) + degrees) % 360;

        if (degrees % 180 !== 0 && ['image', 'rect'].includes(stroke.tool)) {
            const bounds = getStrokeBounds(stroke, rect);
            const cx = bounds.minX + bounds.width / 2;
            const cy = bounds.minY + bounds.height / 2;
            const newW = bounds.height;
            const newH = bounds.width;

            stroke.points = [
                { x: (cx - newW / 2) / rect.width, y: (cy - newH / 2) / rect.height },
                { x: (cx + newW / 2) / rect.width, y: (cy + newH / 2) / rect.height },
            ];
            stroke.rotation = 0;
        }

        strokes.current.set(selectedStrokeId, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, canvasRef, redrawCanvas, sendMessage, pushHistory]);

    const duplicateSelected = useCallback(() => {
        if (!selectedStrokeId) return;
        const stroke = strokes.current.get(selectedStrokeId);
        if (!stroke) return;

        const newId = generateStrokeId();
        const offset = 0.03;
        const newStroke: Stroke = {
            ...stroke,
            id: newId,
            board: stroke.board || currentBoardRef.current,
            points: stroke.points.map(p => ({ x: Math.min(p.x + offset, 0.95), y: Math.min(p.y + offset, 0.95) })),
            timestamp: Date.now(),
        };

        strokes.current.set(newId, newStroke);
        setSelectedStrokeId(newId);
        pushHistory({
            type: 'add',
            stroke: { ...newStroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: newStroke,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage, pushHistory]);

    const bringSelectedToFront = useCallback(() => {
        if (!selectedStrokeId) return;
        const stroke = strokes.current.get(selectedStrokeId);
        if (!stroke) return;

        strokes.current.delete(selectedStrokeId);
        strokes.current.set(selectedStrokeId, stroke);
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage]);

    const sendSelectedToBack = useCallback(() => {
        if (!selectedStrokeId) return;
        const stroke = strokes.current.get(selectedStrokeId);
        if (!stroke) return;

        const existing = Array.from(strokes.current.entries());
        strokes.current.clear();
        strokes.current.set(selectedStrokeId, stroke);
        for (const [id, s] of existing) {
            if (id !== selectedStrokeId) {
                strokes.current.set(id, s);
            }
        }
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage]);

    const resetSelectedAspectRatio = useCallback(() => {
        if (!selectedStrokeId) return;
        const stroke = strokes.current.get(selectedStrokeId);
        if (!stroke || stroke.tool !== 'image' || !stroke.imageUrl) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const img = loadedImages.current.get(stroke.imageUrl) || new Image();
        if (!img.src) img.src = stroke.imageUrl;

        const doReset = () => {
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                const bounds = getStrokeBounds(stroke, rect);
                const currentWidth = bounds.width;
                const newHeight = currentWidth * (img.naturalHeight / img.naturalWidth);
                const newMaxY = bounds.minY + newHeight;

                stroke.points = [
                    { x: bounds.minX / rect.width, y: bounds.minY / rect.height },
                    { x: bounds.maxX / rect.width, y: newMaxY / rect.height },
                ];
                strokes.current.set(selectedStrokeId, stroke);
                pushHistory({
                    type: 'modify',
                    before: strokeBefore,
                    after: { ...stroke },
                });
                redrawCanvas();
                sendMessage({
                    type: 'stroke',
                    data: stroke,
                    timestamp: Date.now(),
                });
            }
        };

        if (img.complete && img.naturalWidth > 0) {
            doReset();
        } else {
            img.onload = doReset;
        }
    }, [selectedStrokeId, canvasRef, redrawCanvas, sendMessage, pushHistory]);

    const getStrokeBoundsForCanvas = useCallback((stroke: Stroke): StrokeBounds | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return getStrokeBounds(stroke, canvas.getBoundingClientRect());
    }, [canvasRef]);

    const handlePointerUp = useCallback(() => {
        // 1. Finalize drag or resize transformation
        if ((isDragging.current || resizeHandle.current) && selectedStrokeId && dragStartStrokeSnapshot.current) {
            const stroke = strokes.current.get(selectedStrokeId);
            if (stroke) {
                const beforeJson = JSON.stringify(dragStartStrokeSnapshot.current);
                const afterJson = JSON.stringify(stroke);
                if (beforeJson !== afterJson) {
                    pushHistory({
                        type: 'modify',
                        before: dragStartStrokeSnapshot.current,
                        after: { ...stroke },
                    });
                }
                sendMessage({
                    type: 'stroke',
                    data: stroke,
                    timestamp: Date.now(),
                });
            }
        }

        // 2. Finalize eraser session
        if (eraserSessionRef.current) {
            const { removed, added } = eraserSessionRef.current;
            if (removed.size > 0 || added.size > 0) {
                pushHistory({
                    type: 'replace',
                    removed: Array.from(removed.values()),
                    added: Array.from(added.values()),
                });
            }
            eraserSessionRef.current = null;
        }

        // 3. Finalize drawing stroke
        if (currentStroke.current && currentStroke.current.tool !== 'eraser') {
            pushHistory({
                type: 'add',
                stroke: { ...currentStroke.current },
            });
            sendMessage({
                type: 'stroke',
                data: currentStroke.current,
                timestamp: Date.now(),
            });
        }

        isDrawing.current = false;
        currentStroke.current = null;
        shapeStartPoint.current = null;
        isDragging.current = false;
        dragStartPoint.current = null;
        dragStartStrokePoints.current = [];
        dragStartStrokeSnapshot.current = null;
        resizeHandle.current = null;
        resizeStartPoint.current = null;
        resizeStartBounds.current = null;
        resizeStartStrokePoints.current = [];
    }, [sendMessage, selectedStrokeId, pushHistory]);

    // Global keyboard listener for Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            if (isCtrlOrCmd) {
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        try {
            (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
        } catch {}

        const point = getCanvasPoint(e);
        if (!point) return;

        if (currentTool === 'select') {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = point.x * rect.width;
            const clickY = point.y * rect.height;

            // 1. Check delete badge & handles on current selection
            if (selectedStrokeId) {
                const selectedStroke = strokes.current.get(selectedStrokeId);
                if (selectedStroke) {
                    const bounds = getStrokeBounds(selectedStroke, rect);

                    // Check delete badge
                    const deleteBadgeX = bounds.maxX + 12;
                    const deleteBadgeY = bounds.minY - 12;
                    if (Math.hypot(clickX - deleteBadgeX, clickY - deleteBadgeY) <= 14) {
                        deleteSelected();
                        return;
                    }

                    // Check corner handles (12px hit radius)
                    const cornerHandles = [
                        { name: 'tl' as const, x: bounds.minX, y: bounds.minY },
                        { name: 'tr' as const, x: bounds.maxX, y: bounds.minY },
                        { name: 'bl' as const, x: bounds.minX, y: bounds.maxY },
                        { name: 'br' as const, x: bounds.maxX, y: bounds.maxY },
                    ];

                    for (const handle of cornerHandles) {
                        if (Math.hypot(clickX - handle.x, clickY - handle.y) <= 12) {
                            resizeHandle.current = handle.name;
                            resizeStartPoint.current = point;
                            resizeStartBounds.current = { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY };
                            resizeStartStrokePoints.current = selectedStroke.points.map(p => ({ ...p }));
                            dragStartStrokeSnapshot.current = JSON.parse(JSON.stringify(selectedStroke));
                            isDragging.current = false;
                            return;
                        }
                    }

                    // Check side handles (10px hit radius)
                    const sideHandles = [
                        { name: 't' as const, x: bounds.minX + bounds.width / 2, y: bounds.minY },
                        { name: 'b' as const, x: bounds.minX + bounds.width / 2, y: bounds.maxY },
                        { name: 'l' as const, x: bounds.minX, y: bounds.minY + bounds.height / 2 },
                        { name: 'r' as const, x: bounds.maxX, y: bounds.minY + bounds.height / 2 },
                    ];

                    for (const handle of sideHandles) {
                        if (Math.hypot(clickX - handle.x, clickY - handle.y) <= 10) {
                            resizeHandle.current = handle.name;
                            resizeStartPoint.current = point;
                            resizeStartBounds.current = { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY };
                            resizeStartStrokePoints.current = selectedStroke.points.map(p => ({ ...p }));
                            dragStartStrokeSnapshot.current = JSON.parse(JSON.stringify(selectedStroke));
                            isDragging.current = false;
                            return;
                        }
                    }

                    // If clicking inside the already selected stroke's bounding box, start dragging
                    if (clickX >= bounds.minX && clickX <= bounds.maxX && clickY >= bounds.minY && clickY <= bounds.maxY) {
                        isDragging.current = true;
                        dragStartPoint.current = point;
                        dragStartStrokePoints.current = selectedStroke.points.map(p => ({ ...p }));
                        dragStartStrokeSnapshot.current = JSON.parse(JSON.stringify(selectedStroke));
                        resizeHandle.current = null;
                        return;
                    }
                }
            }

            // 2. Hit detection to select another stroke
            let foundStrokeId: string | null = null;
            const strokesArray = Array.from(strokes.current.entries()).reverse();
            const activeBoard = currentBoardRef.current;

            for (const [strokeId, stroke] of strokesArray) {
                const strokeBoard = stroke.board || 1;
                if (strokeBoard !== activeBoard) {
                    continue;
                }

                const bounds = getStrokeBounds(stroke, rect);
                if (stroke.tool === 'image' || stroke.tool === 'text' || stroke.tool === 'table') {
                    if (clickX >= bounds.minX && clickX <= bounds.maxX && clickY >= bounds.minY && clickY <= bounds.maxY) {
                        foundStrokeId = strokeId;
                        break;
                    }
                } else if (['rect', 'circle', 'triangle', 'star'].includes(stroke.tool)) {
                    if (clickX >= bounds.minX && clickX <= bounds.maxX && clickY >= bounds.minY && clickY <= bounds.maxY) {
                        foundStrokeId = strokeId;
                        break;
                    }
                } else {
                    if (isStrokeIntersecting(stroke, clickX, clickY, 12, rect)) {
                        foundStrokeId = strokeId;
                        break;
                    }
                }
            }

            if (foundStrokeId) {
                setSelectedStrokeId(foundStrokeId);
                isDragging.current = true;
                dragStartPoint.current = point;
                const stroke = strokes.current.get(foundStrokeId);
                if (stroke) {
                    dragStartStrokePoints.current = stroke.points.map(p => ({ ...p }));
                    dragStartStrokeSnapshot.current = JSON.parse(JSON.stringify(stroke));
                }
            } else {
                setSelectedStrokeId(null);
                isDragging.current = false;
                resizeHandle.current = null;
                dragStartStrokeSnapshot.current = null;
            }
            redrawCanvas();
            return;
        }

        const activeBoard = currentBoardRef.current;

        if (currentTool === 'eraser') {
            isDrawing.current = true;
            eraserSessionRef.current = {
                removed: new Map<string, Stroke>(),
                added: new Map<string, Stroke>(),
            };
            currentStroke.current = {
                id: '',
                tool: 'eraser',
                color: '',
                size: currentSize,
                points: [point],
                board: activeBoard,
                timestamp: Date.now(),
            };
            eraseStrokesAtPoint(point);
            return;
        }

        isDrawing.current = true;

        if (['rect', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(currentTool)) {
            shapeStartPoint.current = point;
            const strokeId = generateStrokeId();
            currentStroke.current = {
                id: strokeId,
                tool: currentTool,
                color: currentColor,
                size: currentSize,
                points: [point, point],
                board: activeBoard,
                timestamp: Date.now(),
            };
            strokes.current.set(strokeId, currentStroke.current);
        } else {
            const strokeId = generateStrokeId();
            const color = currentTool === 'rainbow'
                ? rainbowColors[0]
                : currentColor;

            currentStroke.current = {
                id: strokeId,
                tool: currentTool,
                color,
                size: currentSize,
                points: [point],
                board: activeBoard,
                timestamp: Date.now(),
            };
            strokes.current.set(strokeId, currentStroke.current);
        }

        redrawCanvas();
    }, [currentTool, currentColor, currentSize, currentBoard, getCanvasPoint, redrawCanvas, selectedStrokeId, eraseStrokesAtPoint, deleteSelected]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // SAFETY GUARD: If mouse button is not held down, reset drag/resize states immediately
        if (e.buttons === 0) {
            if (isDragging.current || resizeHandle.current || isDrawing.current) {
                handlePointerUp();
            }
        }

        const point = getCanvasPoint(e);
        if (!point) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Handle resizing (ONLY while mouse button is continuously pressed)
        if (e.buttons > 0 && resizeHandle.current && resizeStartPoint.current && resizeStartBounds.current && selectedStrokeId) {
            const stroke = strokes.current.get(selectedStrokeId);
            if (!stroke) return;

            const clickX = point.x * rect.width;
            const clickY = point.y * rect.height;
            const { minX, minY, maxX, maxY } = resizeStartBounds.current;
            const origW = Math.max(maxX - minX, 10);
            const origH = Math.max(maxY - minY, 10);

            let newMinX = minX;
            let newMaxX = maxX;
            let newMinY = minY;
            let newMaxY = maxY;

            const handle = resizeHandle.current;

            if (stroke.tool === 'image' && ['tl', 'tr', 'bl', 'br'].includes(handle)) {
                // Symmetrical proportional corner resize following cursor
                if (handle === 'br') {
                    const curW = Math.max(clickX - minX, 30);
                    const curH = Math.max(clickY - minY, 30);
                    const scale = Math.max((curW / origW + curH / origH) / 2, 0.1);
                    newMaxX = minX + origW * scale;
                    newMaxY = minY + origH * scale;
                } else if (handle === 'bl') {
                    const curW = Math.max(maxX - clickX, 30);
                    const curH = Math.max(clickY - minY, 30);
                    const scale = Math.max((curW / origW + curH / origH) / 2, 0.1);
                    newMinX = maxX - origW * scale;
                    newMaxY = minY + origH * scale;
                } else if (handle === 'tr') {
                    const curW = Math.max(clickX - minX, 30);
                    const curH = Math.max(maxY - clickY, 30);
                    const scale = Math.max((curW / origW + curH / origH) / 2, 0.1);
                    newMaxX = minX + origW * scale;
                    newMinY = maxY - origH * scale;
                } else if (handle === 'tl') {
                    const curW = Math.max(maxX - clickX, 30);
                    const curH = Math.max(maxY - clickY, 30);
                    const scale = Math.max((curW / origW + curH / origH) / 2, 0.1);
                    newMinX = maxX - origW * scale;
                    newMinY = maxY - origH * scale;
                }
            } else {
                const dx = (point.x - resizeStartPoint.current.x) * rect.width;
                const dy = (point.y - resizeStartPoint.current.y) * rect.height;

                if (handle.includes('l')) newMinX = Math.min(minX + dx, maxX - 25);
                if (handle.includes('r')) newMaxX = Math.max(maxX + dx, minX + 25);
                if (handle.includes('t')) newMinY = Math.min(minY + dy, maxY - 25);
                if (handle.includes('b')) newMaxY = Math.max(maxY + dy, minY + 25);
            }

            if (['image', 'rect', 'circle', 'triangle', 'star', 'table'].includes(stroke.tool)) {
                stroke.points = [
                    { x: newMinX / rect.width, y: newMinY / rect.height },
                    { x: newMaxX / rect.width, y: newMaxY / rect.height },
                ];
            } else if (['line', 'arrow'].includes(stroke.tool) && resizeStartStrokePoints.current.length >= 2) {
                const newW = newMaxX - newMinX;
                const newH = newMaxY - newMinY;
                stroke.points = resizeStartStrokePoints.current.map(p => ({
                    x: (newMinX + ((p.x * rect.width - minX) / origW) * newW) / rect.width,
                    y: (newMinY + ((p.y * rect.height - minY) / origH) * newH) / rect.height,
                }));
            } else if (stroke.tool === 'text') {
                const newH = newMaxY - newMinY;
                stroke.size = Math.max(1, Math.round(newH / 16));
            }

            strokes.current.set(selectedStrokeId, stroke);
            redrawCanvas();
            return;
        }

        // Handle dragging (ONLY while mouse button is continuously pressed)
        if (e.buttons > 0 && isDragging.current && dragStartPoint.current && selectedStrokeId) {
            const stroke = strokes.current.get(selectedStrokeId);
            if (!stroke) return;

            const dx = point.x - dragStartPoint.current.x;
            const dy = point.y - dragStartPoint.current.y;

            stroke.points = dragStartStrokePoints.current.map(p => ({
                x: p.x + dx,
                y: p.y + dy,
            }));

            strokes.current.set(selectedStrokeId, stroke);
            redrawCanvas();
            return;
        }

        // Dynamic cursor on hover in select mode
        if (currentTool === 'select') {
            const canvas = canvasRef.current;
            if (canvas) {
                let nextCursor = 'default';
                if (selectedStrokeId) {
                    const stroke = strokes.current.get(selectedStrokeId);
                    if (stroke) {
                        const bounds = getStrokeBounds(stroke, rect);
                        const clickX = point.x * rect.width;
                        const clickY = point.y * rect.height;

                        const deleteBadgeX = bounds.maxX + 12;
                        const deleteBadgeY = bounds.minY - 12;
                        if (Math.hypot(clickX - deleteBadgeX, clickY - deleteBadgeY) <= 14) {
                            nextCursor = 'pointer';
                        } else {
                            const handles = [
                                { x: bounds.minX, y: bounds.minY, cursor: 'nwse-resize' },
                                { x: bounds.maxX, y: bounds.maxY, cursor: 'nwse-resize' },
                                { x: bounds.maxX, y: bounds.minY, cursor: 'nesw-resize' },
                                { x: bounds.minX, y: bounds.maxY, cursor: 'nesw-resize' },
                                { x: bounds.minX + bounds.width / 2, y: bounds.minY, cursor: 'ns-resize' },
                                { x: bounds.minX + bounds.width / 2, y: bounds.maxY, cursor: 'ns-resize' },
                                { x: bounds.minX, y: bounds.minY + bounds.height / 2, cursor: 'ew-resize' },
                                { x: bounds.maxX, y: bounds.minY + bounds.height / 2, cursor: 'ew-resize' },
                            ];

                            for (const h of handles) {
                                if (Math.hypot(clickX - h.x, clickY - h.y) <= 12) {
                                    nextCursor = h.cursor;
                                    break;
                                }
                            }

                            if (nextCursor === 'default' && clickX >= bounds.minX && clickX <= bounds.maxX && clickY >= bounds.minY && clickY <= bounds.maxY) {
                                nextCursor = 'grab';
                            }
                        }
                    }
                }
                canvas.style.cursor = nextCursor;
            }
        }

        if (!isDrawing.current || !currentStroke.current || e.buttons === 0) return;

        if (currentTool === 'eraser') {
            eraseStrokesAtPoint(point);
            return;
        }

        if (['rect', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(currentTool)) {
            currentStroke.current.points[1] = point;
        } else {
            currentStroke.current.points.push(point);
        }

        strokes.current.set(currentStroke.current.id, currentStroke.current);
        redrawCanvas();
    }, [currentTool, getCanvasPoint, redrawCanvas, selectedStrokeId, eraseStrokesAtPoint, canvasRef, handlePointerUp]);

    // Global pointerup and mouseup listener to always release drag / resize state
    useEffect(() => {
        const handleGlobalPointerUp = () => {
            if (isDragging.current || resizeHandle.current || isDrawing.current) {
                handlePointerUp();
            }
        };
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('mouseup', handleGlobalPointerUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('mouseup', handleGlobalPointerUp);
        };
    }, [handlePointerUp]);

    const handleRemoteMessage = useCallback((message: WhiteboardMessage) => {
        console.log('[useWhiteboard] 🎨 handleRemoteMessage received:', message.type);
        if (message.type === 'stroke' && message.data) {
            const stroke = hydrateStroke(message.data as Stroke);
            const existing = strokes.current.get(stroke.id);
            if (!stroke.board) {
                stroke.board = existing?.board || message.board || currentBoardRef.current || 1;
            }
            strokes.current.set(stroke.id, stroke);
            redrawCanvas();
        } else if (message.type === 'clear') {
            strokes.current.clear();
            loadedImages.current.clear();
            redrawCanvas();
        } else if (message.type === 'clear-board' && message.board !== undefined) {
            const targetBoard = message.board;
            const strokesArray = Array.from(strokes.current.entries());
            for (const [strokeId, stroke] of strokesArray) {
                const strokeBoard = stroke.board || 1;
                if (strokeBoard === targetBoard) {
                    strokes.current.delete(strokeId);
                }
            }
            redrawCanvas();
        } else if (message.type === 'delete-strokes' && (message.strokeIds || message.data)) {
            const idsToDelete = message.strokeIds || (Array.isArray(message.data) ? (message.data as string[]) : []);
            if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
                idsToDelete.forEach((id) => {
                    strokes.current.delete(id);
                });
                if (selectedStrokeId && idsToDelete.includes(selectedStrokeId)) {
                    setSelectedStrokeId(null);
                }
                redrawCanvas();
            }
        } else if (message.type === 'change-board' && message.board !== undefined) {
            console.log('[useWhiteboard] 🔄 Remote change-board to:', message.board);
            currentBoardRef.current = message.board;
            setCurrentBoard(message.board);
            setSelectedStrokeId(null);
            redrawCanvas();
        } else if (message.type === 'delete-stroke' && (message.strokeId || (typeof message.data === 'string' ? message.data : null))) {
            const idToDelete = message.strokeId || (typeof message.data === 'string' ? message.data : null);
            if (idToDelete) {
                strokes.current.delete(idToDelete);
                if (selectedStrokeId === idToDelete) {
                    setSelectedStrokeId(null);
                }
                redrawCanvas();
            }
        }
    }, [redrawCanvas, selectedStrokeId]);

    const clearCanvas = useCallback(() => {
        const allStrokes = Array.from(strokes.current.values()).map(s => ({ ...s }));
        if (allStrokes.length > 0) {
            pushHistory({
                type: 'clear',
                strokes: allStrokes,
            });
        }
        strokes.current.clear();
        loadedImages.current.clear();
        redrawCanvas();
        sendMessage({
            type: 'clear',
            timestamp: Date.now(),
        });
    }, [redrawCanvas, sendMessage, pushHistory]);

    const clearBoard = useCallback((board: number) => {
        const strokesArray = Array.from(strokes.current.entries());
        const deletedIds: string[] = [];
        const deletedStrokes: Stroke[] = [];
        for (const [strokeId, stroke] of strokesArray) {
            const strokeBoard = stroke.board || 1;
            if (strokeBoard === board) {
                strokes.current.delete(strokeId);
                deletedIds.push(strokeId);
                deletedStrokes.push({ ...stroke });
            }
        }
        if (deletedStrokes.length > 0) {
            pushHistory({
                type: 'clear',
                strokes: deletedStrokes,
                board,
            });
        }
        if (selectedStrokeId && deletedIds.includes(selectedStrokeId)) {
            setSelectedStrokeId(null);
        }
        redrawCanvas();
        sendMessage({
            type: 'clear-board',
            board,
            strokeIds: deletedIds,
            timestamp: Date.now(),
        });
    }, [redrawCanvas, sendMessage, selectedStrokeId, pushHistory]);

    const addTextStroke = useCallback((text: string, position: Point) => {
        const strokeId = generateStrokeId();
        const activeBoard = currentBoardRef.current;
        const stroke: Stroke = {
            id: strokeId,
            tool: 'text',
            color: currentColor,
            size: currentSize,
            points: [position],
            board: activeBoard,
            text,
            timestamp: Date.now(),
        };
        strokes.current.set(strokeId, stroke);
        setSelectedStrokeId(strokeId);
        pushHistory({
            type: 'add',
            stroke: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: activeBoard,
            timestamp: Date.now(),
        });
    }, [currentColor, currentSize, redrawCanvas, sendMessage, pushHistory]);

    const addImageStroke = useCallback((imageUrl: string, position: Point) => {
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        const canvasWidth = rect?.width || 1000;
        const canvasHeight = rect?.height || 600;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        const applyImage = (imgW: number, imgH: number) => {
            const strokeId = generateStrokeId();
            const activeBoard = currentBoardRef.current;
            loadedImages.current.set(imageUrl, img);

            // Calculate dimensions preserving the image's exact natural aspect ratio
            const targetPixelWidth = Math.min(360, canvasWidth * 0.45);
            const targetPixelHeight = targetPixelWidth * (imgH / Math.max(imgW, 1));

            // Convert to normalized coordinates [0, 1]
            const normW = targetPixelWidth / canvasWidth;
            const normH = targetPixelHeight / canvasHeight;

            // Position within canvas bounds
            const p0x = Math.max(0.05, Math.min(position.x, 0.95 - normW));
            const p0y = Math.max(0.05, Math.min(position.y, 0.95 - normH));

            const stroke: Stroke = {
                id: strokeId,
                tool: 'image',
                color: '',
                size: 0,
                points: [
                    { x: p0x, y: p0y },
                    { x: p0x + normW, y: p0y + normH },
                ],
                board: activeBoard,
                imageUrl,
                timestamp: Date.now(),
            };

            strokes.current.set(strokeId, stroke);
            setSelectedStrokeId(strokeId);
            setCurrentTool('select');
            pushHistory({
                type: 'add',
                stroke: { ...stroke },
            });
            redrawCanvas();
            sendMessage({
                type: 'stroke',
                data: stroke,
                board: activeBoard,
                timestamp: Date.now(),
            });
        };

        if (img.complete && img.naturalWidth > 0) {
            applyImage(img.naturalWidth, img.naturalHeight);
        } else {
            img.onload = () => {
                applyImage(img.naturalWidth, img.naturalHeight);
            };
            img.onerror = () => {
                applyImage(400, 300);
            };
        }
    }, [canvasRef, redrawCanvas, sendMessage, pushHistory]);

    const addTableStroke = useCallback((rows: number = 3, cols: number = 3, position?: Point) => {
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        const canvasWidth = rect?.width || 1000;
        const canvasHeight = rect?.height || 600;

        const strokeId = generateStrokeId();
        const activeBoard = currentBoardRef.current;

        const validRows = Math.min(15, Math.max(1, rows));
        const validCols = Math.min(15, Math.max(1, cols));

        // Calculate comfortable dimensions on canvas
        const targetWidth = Math.min(canvasWidth * 0.7, Math.max(260, validCols * 100));
        const targetHeight = Math.min(canvasHeight * 0.65, Math.max(150, validRows * 46));

        const normW = targetWidth / canvasWidth;
        const normH = targetHeight / canvasHeight;

        // Position: centered or at given point
        const p0x = position ? Math.max(0.05, Math.min(position.x, 0.95 - normW)) : 0.22;
        const p0y = position ? Math.max(0.05, Math.min(position.y, 0.95 - normH)) : 0.22;

        const initialData: string[][] = Array.from({ length: validRows }, () => Array(validCols).fill(''));

        const stroke: Stroke = {
            id: strokeId,
            tool: 'table',
            color: currentColor === '#ffffff' ? '#1e293b' : currentColor,
            size: Math.max(2, currentSize),
            points: [
                { x: p0x, y: p0y },
                { x: p0x + normW, y: p0y + normH },
            ],
            board: activeBoard,
            tableRows: validRows,
            tableCols: validCols,
            tableData: initialData,
            text: JSON.stringify({ rows: validRows, cols: validCols, data: initialData }),
            timestamp: Date.now(),
        };

        strokes.current.set(strokeId, stroke);
        setSelectedStrokeId(strokeId);
        setCurrentTool('select');
        pushHistory({
            type: 'add',
            stroke: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: activeBoard,
            timestamp: Date.now(),
        });
    }, [canvasRef, currentColor, currentSize, redrawCanvas, sendMessage, pushHistory]);

    const updateTableCell = useCallback((strokeId: string, row: number, col: number, text: string) => {
        const stroke = strokes.current.get(strokeId);
        if (!stroke || stroke.tool !== 'table') return;

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const rows = stroke.tableRows || 3;
        const cols = stroke.tableCols || 3;
        const data = stroke.tableData
            ? stroke.tableData.map(r => [...r])
            : Array.from({ length: rows }, () => Array(cols).fill(''));

        while (data.length <= row) {
            data.push(Array(cols).fill(''));
        }
        while (data[row].length <= col) {
            data[row].push('');
        }

        data[row][col] = text;
        stroke.tableData = data;
        stroke.text = JSON.stringify({ rows: stroke.tableRows, cols: stroke.tableCols, data });

        strokes.current.set(strokeId, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: stroke.board || currentBoardRef.current,
            timestamp: Date.now(),
        });
    }, [redrawCanvas, sendMessage, pushHistory]);

    const addTableRow = useCallback((targetStrokeId?: string) => {
        const id = targetStrokeId || selectedStrokeId;
        if (!id) return;
        const stroke = strokes.current.get(id);
        if (!stroke || stroke.tool !== 'table') return;

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const oldRows = stroke.tableRows || 3;
        if (oldRows >= 15) return;
        const newRows = oldRows + 1;
        const cols = stroke.tableCols || 3;

        const data = stroke.tableData ? stroke.tableData.map(r => [...r]) : Array.from({ length: oldRows }, () => Array(cols).fill(''));
        data.push(Array(cols).fill(''));

        stroke.tableRows = newRows;
        stroke.tableData = data;

        if (stroke.points.length >= 2) {
            const h = stroke.points[1].y - stroke.points[0].y;
            const newH = h * (newRows / oldRows);
            stroke.points[1].y = stroke.points[0].y + newH;
        }

        stroke.text = JSON.stringify({ rows: newRows, cols, data });
        strokes.current.set(id, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: stroke.board || currentBoardRef.current,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage, pushHistory]);

    const removeTableRow = useCallback((targetStrokeId?: string) => {
        const id = targetStrokeId || selectedStrokeId;
        if (!id) return;
        const stroke = strokes.current.get(id);
        if (!stroke || stroke.tool !== 'table') return;

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const oldRows = stroke.tableRows || 3;
        if (oldRows <= 1) return;
        const newRows = oldRows - 1;
        const cols = stroke.tableCols || 3;

        const data = stroke.tableData ? stroke.tableData.map(r => [...r]) : Array.from({ length: oldRows }, () => Array(cols).fill(''));
        data.pop();

        stroke.tableRows = newRows;
        stroke.tableData = data;

        if (stroke.points.length >= 2) {
            const h = stroke.points[1].y - stroke.points[0].y;
            const newH = h * (newRows / oldRows);
            stroke.points[1].y = stroke.points[0].y + newH;
        }

        stroke.text = JSON.stringify({ rows: newRows, cols, data });
        strokes.current.set(id, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: stroke.board || currentBoardRef.current,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage, pushHistory]);

    const addTableCol = useCallback((targetStrokeId?: string) => {
        const id = targetStrokeId || selectedStrokeId;
        if (!id) return;
        const stroke = strokes.current.get(id);
        if (!stroke || stroke.tool !== 'table') return;

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const rows = stroke.tableRows || 3;
        const oldCols = stroke.tableCols || 3;
        if (oldCols >= 15) return;
        const newCols = oldCols + 1;

        const data = stroke.tableData ? stroke.tableData.map(r => [...r, '']) : Array.from({ length: rows }, () => Array(newCols).fill(''));

        stroke.tableCols = newCols;
        stroke.tableData = data;

        if (stroke.points.length >= 2) {
            const w = stroke.points[1].x - stroke.points[0].x;
            const newW = w * (newCols / oldCols);
            stroke.points[1].x = stroke.points[0].x + newW;
        }

        stroke.text = JSON.stringify({ rows, cols: newCols, data });
        strokes.current.set(id, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: stroke.board || currentBoardRef.current,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage, pushHistory]);

    const removeTableCol = useCallback((targetStrokeId?: string) => {
        const id = targetStrokeId || selectedStrokeId;
        if (!id) return;
        const stroke = strokes.current.get(id);
        if (!stroke || stroke.tool !== 'table') return;

        const strokeBefore = JSON.parse(JSON.stringify(stroke));

        const rows = stroke.tableRows || 3;
        const oldCols = stroke.tableCols || 3;
        if (oldCols <= 1) return;
        const newCols = oldCols - 1;

        const data = stroke.tableData ? stroke.tableData.map(r => r.slice(0, newCols)) : Array.from({ length: rows }, () => Array(newCols).fill(''));

        stroke.tableCols = newCols;
        stroke.tableData = data;

        if (stroke.points.length >= 2) {
            const w = stroke.points[1].x - stroke.points[0].x;
            const newW = w * (newCols / oldCols);
            stroke.points[1].x = stroke.points[0].x + newW;
        }

        stroke.text = JSON.stringify({ rows, cols: newCols, data });
        strokes.current.set(id, stroke);
        pushHistory({
            type: 'modify',
            before: strokeBefore,
            after: { ...stroke },
        });
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            board: stroke.board || currentBoardRef.current,
            timestamp: Date.now(),
        });
    }, [selectedStrokeId, redrawCanvas, sendMessage, pushHistory]);

    const setActive = useCallback((active: boolean) => {
        setIsActive(active);
        if (active) {
            setTimeout(redrawCanvas, 100);
        }
    }, [redrawCanvas]);

    const setTool = useCallback((tool: DrawingTool) => {
        setCurrentTool(tool);
        if (tool !== 'select') {
            setSelectedStrokeId(null);
        }
    }, []);

    const getStrokes = useCallback((): Stroke[] => {
        return Array.from(strokes.current.values());
    }, []);

    const loadStrokes = useCallback((loadedStrokes: Stroke[]) => {
        strokes.current.clear();
        if (Array.isArray(loadedStrokes)) {
            loadedStrokes.forEach((s) => {
                if (s && s.id) {
                    const stroke = hydrateStroke(s);
                    if (!stroke.board) {
                        stroke.board = 1;
                    }
                    strokes.current.set(stroke.id, stroke);
                }
            });
        }
        redrawCanvas();
    }, [redrawCanvas]);

    const exportImage = useCallback((): string | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        try {
            return canvas.toDataURL('image/png');
        } catch {
            return null;
        }
    }, [canvasRef]);

    // Initialize from initialStrokes — only re-run when the prop array reference changes (i.e. board data reloaded from server).
    // IMPORTANT: redrawCanvas is intentionally NOT in the dependency array here.
    // Adding it would cause strokes.current.clear() to fire whenever the redrawCanvas
    // callback reference changes (e.g. after selectedStrokeId changes), which would wipe
    // all locally drawn strokes.
    useEffect(() => {
        if (initialStrokes && Array.isArray(initialStrokes)) {
            strokes.current.clear();
            initialStrokes.forEach((s) => {
                if (s && s.id) {
                    const stroke = hydrateStroke(s);
                    if (!stroke.board) {
                        stroke.board = 1;
                    }
                    strokes.current.set(stroke.id, stroke);
                }
            });
            setTimeout(redrawCanvas, 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialStrokes]); // Deliberately omit redrawCanvas — see comment above


    // Redraw when currentBoard changes
    useEffect(() => {
        redrawCanvas();
    }, [currentBoard, redrawCanvas]);

    const setBoard = useCallback((board: number, broadcast = true) => {
        console.log('[useWhiteboard] 🔄 setBoard called:', board, 'broadcast:', broadcast);
        currentBoardRef.current = board;
        setCurrentBoard(board);
        setSelectedStrokeId(null);
        redrawCanvas();
        if (broadcast) {
            sendMessage({
                type: 'change-board',
                board,
                timestamp: Date.now(),
            });
        }
    }, [sendMessage, redrawCanvas]);

    const selectedStroke = selectedStrokeId ? (strokes.current.get(selectedStrokeId) || null) : null;

    return {
        currentTool,
        currentColor,
        currentSize,
        currentBoard,
        eraserType,
        selectedStrokeId,
        selectedStroke,
        canUndo,
        canRedo,
        redrawCanvas,
        setTool,
        setColor: setCurrentColor,
        setSize: setCurrentSize,
        setBoard,
        setEraserType,
        undo,
        redo,
        clearCanvas,
        clearBoard,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleRemoteMessage,
        setActive,
        addTextStroke,
        addImageStroke,
        addTableStroke,
        updateTableCell,
        addTableRow,
        removeTableRow,
        addTableCol,
        removeTableCol,
        deleteSelected,
        scaleSelected,
        rotateSelected,
        duplicateSelected,
        bringSelectedToFront,
        sendSelectedToBack,
        resetSelectedAspectRatio,
        getStrokes,
        loadStrokes,
        exportImage,
        getStrokeBoundsForCanvas,
    };
}
