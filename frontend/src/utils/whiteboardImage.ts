/**
 * Whiteboard Image Utilities
 * Optimizes and compresses images for real-time WebRTC DataChannel synchronization.
 */

export async function compressWhiteboardImage(
    fileOrUrl: File | string,
    maxDimension = 1000,
    quality = 0.8
): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(width, 1);
                canvas.height = Math.max(height, 1);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                    return;
                }
            } catch (err) {
                console.warn('[WhiteboardImage] Error compressing image:', err);
            }
            resolve(typeof fileOrUrl === 'string' ? fileOrUrl : '');
        };

        img.onerror = () => {
            console.warn('[WhiteboardImage] Failed to load image for compression');
            resolve(typeof fileOrUrl === 'string' ? fileOrUrl : '');
        };

        if (typeof fileOrUrl === 'string') {
            img.src = fileOrUrl;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = () => {
                resolve('');
            };
            reader.readAsDataURL(fileOrUrl);
        }
    });
}
