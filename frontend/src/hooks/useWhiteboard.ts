/**
 * useWhiteboard Hook
 * 
 * Canvas drawing state management for the whiteboard feature.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DrawingTool, Stroke, Point, WhiteboardMessage } from '@/types/videoRoom';

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

interface UseWhiteboardReturn {
    currentTool: DrawingTool;
    currentColor: string;
    currentSize: number;
    currentBoard: number;
    selectedStrokeId: string | null;
    setTool: (tool: DrawingTool) => void;
    setColor: (color: string) => void;
    setSize: (size: number) => void;
    setBoard: (board: number) => void;
    clearCanvas: () => void;
    clearBoard: (board: number) => void;
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
    handleRemoteMessage: (message: WhiteboardMessage) => void;
    setActive: (active: boolean) => void;
    addTextStroke: (text: string, position: Point) => void;
    addImageStroke: (imageUrl: string, position: Point) => void;
    deleteSelected: () => void;
    getStrokes: () => Stroke[];
    loadStrokes: (loadedStrokes: Stroke[]) => void;
    exportImage: () => string | null;
}

function generateStrokeId(): string {
    return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function interpolateColor(color1: string, color2: string, fraction: number): string {
    // Convert hex to RGB
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

function isStrokeIntersecting(
    stroke: Stroke,
    eraserX: number,
    eraserY: number,
    eraserRadius: number,
    rect: DOMRect
): boolean {
    if (!stroke.points || stroke.points.length === 0) return false;

    const eraserPt = { x: eraserX, y: eraserY };
    const strokeSize = stroke.size || 4;
    const thresholdSq = (eraserRadius + strokeSize / 2) * (eraserRadius + strokeSize / 2);

    if (['pen', 'rainbow', 'highlight'].includes(stroke.tool)) {
        for (let i = 0; i < stroke.points.length; i++) {
            const pA = {
                x: stroke.points[i].x * rect.width,
                y: stroke.points[i].y * rect.height,
            };
            const dx = pA.x - eraserX;
            const dy = pA.y - eraserY;
            if (dx * dx + dy * dy <= thresholdSq) {
                return true;
            }

            if (i < stroke.points.length - 1) {
                const pB = {
                    x: stroke.points[i + 1].x * rect.width,
                    y: stroke.points[i + 1].y * rect.height,
                };
                if (distSqToSegment(eraserPt, pA, pB) <= thresholdSq) {
                    return true;
                }
            }
        }
        return false;
    }

    if (['line', 'arrow'].includes(stroke.tool) && stroke.points.length >= 2) {
        const pA = {
            x: stroke.points[0].x * rect.width,
            y: stroke.points[0].y * rect.height,
        };
        const pB = {
            x: stroke.points[1].x * rect.width,
            y: stroke.points[1].y * rect.height,
        };
        return distSqToSegment(eraserPt, pA, pB) <= thresholdSq;
    }

    if (['rect', 'circle', 'triangle', 'star'].includes(stroke.tool) && stroke.points.length >= 2) {
        const pA = {
            x: stroke.points[0].x * rect.width,
            y: stroke.points[0].y * rect.height,
        };
        const pB = {
            x: stroke.points[1].x * rect.width,
            y: stroke.points[1].y * rect.height,
        };
        const minX = Math.min(pA.x, pB.x) - eraserRadius;
        const maxX = Math.max(pA.x, pB.x) + eraserRadius;
        const minY = Math.min(pA.y, pB.y) - eraserRadius;
        const maxY = Math.max(pA.y, pB.y) + eraserRadius;
        return eraserX >= minX && eraserX <= maxX && eraserY >= minY && eraserY <= maxY;
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

    if (stroke.tool === 'image' && stroke.points.length >= 1) {
        const x = stroke.points[0].x * rect.width;
        const y = stroke.points[0].y * rect.height;
        const width = stroke.points.length > 1
            ? (stroke.points[1].x - stroke.points[0].x) * rect.width
            : 200;
        const height = stroke.points.length > 1
            ? (stroke.points[1].y - stroke.points[0].y) * rect.height
            : 200;
        return (
            eraserX >= x - 4 - eraserRadius &&
            eraserX <= x + width + 4 + eraserRadius &&
            eraserY >= y - 4 - eraserRadius &&
            eraserY <= y + height + 4 + eraserRadius
        );
    }

    return false;
}

export function useWhiteboard({ canvasRef, sendMessage, initialStrokes }: UseWhiteboardOptions): UseWhiteboardReturn {
    const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
    const [currentColor, setCurrentColor] = useState('#0ea5e9');
    const [currentSize, setCurrentSize] = useState(4);
    const [currentBoard, setCurrentBoard] = useState(1);
    const [isActive, setIsActive] = useState(false);
    const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

    const strokes = useRef<Map<string, Stroke>>(new Map());
    const currentStroke = useRef<Stroke | null>(null);
    const isDrawing = useRef(false);
    const rainbowIndex = useRef(0);
    const shapeStartPoint = useRef<Point | null>(null);
    const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());
    const isDragging = useRef(false);
    const dragStartPoint = useRef<Point | null>(null);
    const dragStartStrokePoints = useRef<Point[]>([]);
    const resizeHandle = useRef<'tl' | 'tr' | 'bl' | 'br' | null>(null);
    const resizeStartPoint = useRef<Point | null>(null);
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
        const dpr = window.devicePixelRatio || 1;

        // Clear and fill white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw all strokes for the current board
        strokes.current.forEach((stroke, strokeId) => {
            // Only draw strokes from the current board (or legacy strokes without a board)
            if (stroke.board !== undefined && stroke.board !== currentBoard) {
                return;
            }

            const isSelected = strokeId === selectedStrokeId;

            ctx.save();

            if (stroke.tool === 'text' && stroke.text) {
                const x = stroke.points[0].x * rect.width;
                const y = stroke.points[0].y * rect.height;
                ctx.font = `${stroke.size * 4}px Arial`;
                ctx.fillStyle = stroke.color;
                ctx.fillText(stroke.text, x, y);

                if (isSelected) {
                    const metrics = ctx.measureText(stroke.text);
                    ctx.strokeStyle = '#0ea5e9';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(x - 4, y - stroke.size * 4, metrics.width + 8, stroke.size * 4 + 8);
                }
            } else if (stroke.tool === 'image' && stroke.imageUrl) {
                let img = loadedImages.current.get(stroke.imageUrl);
                if (!img) {
                    img = new Image();
                    img.src = stroke.imageUrl;
                    loadedImages.current.set(stroke.imageUrl, img);
                    img.onload = () => redrawCanvas();
                }
                if (img.complete) {
                    const x = stroke.points[0].x * rect.width;
                    const y = stroke.points[0].y * rect.height;
                    const width = stroke.points.length > 1
                        ? (stroke.points[1].x - stroke.points[0].x) * rect.width
                        : 200;
                    const height = stroke.points.length > 1
                        ? (stroke.points[1].y - stroke.points[0].y) * rect.height
                        : (200 * img.height / img.width);
                    ctx.drawImage(img, x, y, width, height);

                    if (isSelected) {
                        ctx.strokeStyle = '#0ea5e9';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);

                        // Draw resize handles
                        ctx.setLineDash([]);
                        ctx.fillStyle = '#0ea5e9';
                        const handleSize = 8;
                        // Top-left
                        ctx.fillRect(x - 4 - handleSize / 2, y - 4 - handleSize / 2, handleSize, handleSize);
                        // Top-right
                        ctx.fillRect(x + width + 4 - handleSize / 2, y - 4 - handleSize / 2, handleSize, handleSize);
                        // Bottom-left
                        ctx.fillRect(x - 4 - handleSize / 2, y + height + 4 - handleSize / 2, handleSize, handleSize);
                        // Bottom-right
                        ctx.fillRect(x + width + 4 - handleSize / 2, y + height + 4 - handleSize / 2, handleSize, handleSize);
                    }
                }
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
                // Pen, rainbow, eraser
                if (stroke.tool === 'rainbow' && stroke.points.length > 1) {
                    // Draw rainbow with VIBGYOR gradient
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

                        // Interpolate between two rainbow colors
                        const color1 = rainbowColors[lowerIndex];
                        const color2 = rainbowColors[upperIndex];
                        ctx.strokeStyle = interpolateColor(color1, color2, fraction);

                        ctx.beginPath();
                        ctx.moveTo(stroke.points[i].x * rect.width, stroke.points[i].y * rect.height);
                        ctx.lineTo(stroke.points[i + 1].x * rect.width, stroke.points[i + 1].y * rect.height);
                        ctx.stroke();
                    }
                } else {
                    // Regular pen or eraser strokes
                    // Note: Eraser strokes are not rendered (they delete strokes instead)
                    if (stroke.tool === 'eraser') {
                        // Eraser strokes are not rendered
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
                // Arrowhead
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

    const eraseStrokesAtPoint = useCallback((point: Point) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const eraserX = point.x * rect.width;
        const eraserY = point.y * rect.height;
        const eraserRadius = Math.max(currentSize * 2, 12);

        const strokesArray = Array.from(strokes.current.entries());
        const strokesIdsToDelete: string[] = [];

        for (const [strokeId, stroke] of strokesArray) {
            if (stroke.board !== undefined && stroke.board !== currentBoard) {
                continue;
            }

            if (isStrokeIntersecting(stroke, eraserX, eraserY, eraserRadius, rect)) {
                strokesIdsToDelete.push(strokeId);
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
    }, [canvasRef, currentBoard, currentSize, redrawCanvas, selectedStrokeId, sendMessage]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = getCanvasPoint(e);
        if (!point) return;

        if (currentTool === 'select') {
            // Hit detection for selecting strokes
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = point.x * rect.width;
            const clickY = point.y * rect.height;

            // Check if clicking on resize handle of selected stroke
            if (selectedStrokeId) {
                const selectedStroke = strokes.current.get(selectedStrokeId);
                if (selectedStroke?.tool === 'image' && selectedStroke.points.length >= 1) {
                    const x = selectedStroke.points[0].x * rect.width;
                    const y = selectedStroke.points[0].y * rect.height;
                    const width = selectedStroke.points.length > 1
                        ? (selectedStroke.points[1].x - selectedStroke.points[0].x) * rect.width
                        : 200;
                    const height = selectedStroke.points.length > 1
                        ? (selectedStroke.points[1].y - selectedStroke.points[0].y) * rect.height
                        : 200;

                    const handleSize = 8;
                    const tolerance = 6;

                    // Check each resize handle
                    const handles = [
                        { name: 'tl' as const, x: x - 4, y: y - 4 },
                        { name: 'tr' as const, x: x + width + 4, y: y - 4 },
                        { name: 'bl' as const, x: x - 4, y: y + height + 4 },
                        { name: 'br' as const, x: x + width + 4, y: y + height + 4 },
                    ];

                    for (const handle of handles) {
                        if (Math.abs(clickX - handle.x) <= handleSize + tolerance &&
                            Math.abs(clickY - handle.y) <= handleSize + tolerance) {
                            resizeHandle.current = handle.name;
                            resizeStartPoint.current = point;
                            resizeStartStrokePoints.current = [...selectedStroke.points];
                            return;
                        }
                    }
                }
            }

            let foundStrokeId: string | null = null;

            // Check strokes in reverse order (top to bottom)
            const strokesArray = Array.from(strokes.current.entries()).reverse();

            for (const [strokeId, stroke] of strokesArray) {
                if (stroke.tool === 'image' && stroke.points.length >= 1) {
                    const x = stroke.points[0].x * rect.width;
                    const y = stroke.points[0].y * rect.height;
                    const width = stroke.points.length > 1
                        ? (stroke.points[1].x - stroke.points[0].x) * rect.width
                        : 200;
                    const height = stroke.points.length > 1
                        ? (stroke.points[1].y - stroke.points[0].y) * rect.height
                        : 200;

                    if (clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height) {
                        foundStrokeId = strokeId;
                        break;
                    }
                } else if (stroke.tool === 'text' && stroke.text && stroke.points.length >= 1) {
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    const x = stroke.points[0].x * rect.width;
                    const y = stroke.points[0].y * rect.height;
                    ctx.font = `${stroke.size * 4}px Arial`;
                    const metrics = ctx.measureText(stroke.text);
                    const textWidth = metrics.width;
                    const textHeight = stroke.size * 4;

                    if (clickX >= x - 4 && clickX <= x + textWidth + 4 &&
                        clickY >= y - textHeight && clickY <= y + 8) {
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
                    dragStartStrokePoints.current = [...stroke.points];
                }
            } else {
                setSelectedStrokeId(null);
            }
            redrawCanvas();
            return;
        }

        if (currentTool === 'eraser') {
            isDrawing.current = true;
            currentStroke.current = {
                id: '',
                tool: 'eraser',
                color: '',
                size: currentSize,
                points: [point],
                board: currentBoard,
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
                board: currentBoard,
                timestamp: Date.now(),
            };
            strokes.current.set(strokeId, currentStroke.current);
        } else {
            const strokeId = generateStrokeId();
            const color = currentTool === 'rainbow'
                ? rainbowColors[0] // Start with violet, gradient will be applied during render
                : currentColor;

            currentStroke.current = {
                id: strokeId,
                tool: currentTool,
                color,
                size: currentSize,
                points: [point],
                board: currentBoard,
                timestamp: Date.now(),
            };
            strokes.current.set(strokeId, currentStroke.current);
        }

        redrawCanvas();
    }, [currentTool, currentColor, currentSize, currentBoard, getCanvasPoint, redrawCanvas, selectedStrokeId, eraseStrokesAtPoint]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const point = getCanvasPoint(e);
        if (!point) return;

        // Handle resizing
        if (resizeHandle.current && resizeStartPoint.current && selectedStrokeId) {
            const stroke = strokes.current.get(selectedStrokeId);
            if (!stroke || stroke.tool !== 'image') return;

            const dx = point.x - resizeStartPoint.current.x;
            const dy = point.y - resizeStartPoint.current.y;
            const startPoints = resizeStartStrokePoints.current;

            if (startPoints.length >= 2) {
                const newPoints = [...startPoints];

                switch (resizeHandle.current) {
                    case 'tl':
                        newPoints[0] = { x: startPoints[0].x + dx, y: startPoints[0].y + dy };
                        break;
                    case 'tr':
                        newPoints[0] = { x: startPoints[0].x, y: startPoints[0].y + dy };
                        newPoints[1] = { x: startPoints[1].x + dx, y: newPoints[1].y };
                        break;
                    case 'bl':
                        newPoints[0] = { x: startPoints[0].x + dx, y: startPoints[0].y };
                        newPoints[1] = { x: newPoints[1].x, y: startPoints[1].y + dy };
                        break;
                    case 'br':
                        newPoints[1] = { x: startPoints[1].x + dx, y: startPoints[1].y + dy };
                        break;
                }

                stroke.points = newPoints;
                strokes.current.set(selectedStrokeId, stroke);
                redrawCanvas();
            }
            return;
        }

        // Handle dragging
        if (isDragging.current && dragStartPoint.current && selectedStrokeId) {
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

        // Handle drawing
        if (!isDrawing.current || !currentStroke.current) return;

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
    }, [currentTool, getCanvasPoint, redrawCanvas, selectedStrokeId, eraseStrokesAtPoint]);

    const handlePointerUp = useCallback(() => {
        // Send drag/resize updates
        if ((isDragging.current || resizeHandle.current) && selectedStrokeId) {
            const stroke = strokes.current.get(selectedStrokeId);
            if (stroke) {
                sendMessage({
                    type: 'stroke',
                    data: stroke,
                    timestamp: Date.now(),
                });
            }
        }

        // Don't send eraser strokes - they don't need to be persisted
        if (currentStroke.current && currentStroke.current.tool !== 'eraser') {
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
        resizeHandle.current = null;
        resizeStartPoint.current = null;
        resizeStartStrokePoints.current = [];
    }, [sendMessage, selectedStrokeId]);

    const handleRemoteMessage = useCallback((message: WhiteboardMessage) => {
        console.log('[useWhiteboard] 🎨 handleRemoteMessage received:', message.type);
        if (message.type === 'stroke' && message.data) {
            const stroke = message.data as Stroke;
            strokes.current.set(stroke.id, stroke);
            redrawCanvas();
        } else if (message.type === 'clear') {
            strokes.current.clear();
            loadedImages.current.clear();
            redrawCanvas();
        } else if (message.type === 'clear-board' && message.board !== undefined) {
            // Clear all strokes from the specified board
            const strokesArray = Array.from(strokes.current.entries());
            for (const [strokeId, stroke] of strokesArray) {
                if (stroke.board === message.board || (stroke.board === undefined && message.board === 1)) {
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
        strokes.current.clear();
        loadedImages.current.clear();
        redrawCanvas();
        sendMessage({
            type: 'clear',
            timestamp: Date.now(),
        });
    }, [redrawCanvas, sendMessage]);

    const clearBoard = useCallback((board: number) => {
        // Clear all strokes from the specified board
        const strokesArray = Array.from(strokes.current.entries());
        const deletedIds: string[] = [];
        for (const [strokeId, stroke] of strokesArray) {
            if (stroke.board === board || (stroke.board === undefined && board === 1)) {
                strokes.current.delete(strokeId);
                deletedIds.push(strokeId);
            }
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
    }, [redrawCanvas, sendMessage, selectedStrokeId]);

    const addTextStroke = useCallback((text: string, position: Point) => {
        const strokeId = generateStrokeId();
        const stroke: Stroke = {
            id: strokeId,
            tool: 'text',
            color: currentColor,
            size: currentSize,
            points: [position],
            board: currentBoard,
            text,
            timestamp: Date.now(),
        };
        strokes.current.set(strokeId, stroke);
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            timestamp: Date.now(),
        });
    }, [currentColor, currentSize, currentBoard, redrawCanvas, sendMessage]);

    const addImageStroke = useCallback((imageUrl: string, position: Point) => {
        const strokeId = generateStrokeId();
        const stroke: Stroke = {
            id: strokeId,
            tool: 'image',
            color: '',
            size: 0,
            points: [position, { x: position.x + 0.2, y: position.y + 0.15 }],
            board: currentBoard,
            imageUrl,
            timestamp: Date.now(),
        };
        strokes.current.set(strokeId, stroke);
        redrawCanvas();
        sendMessage({
            type: 'stroke',
            data: stroke,
            timestamp: Date.now(),
        });
    }, [currentBoard, redrawCanvas, sendMessage]);

    const deleteSelected = useCallback(() => {
        if (selectedStrokeId) {
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
    }, [selectedStrokeId, redrawCanvas, sendMessage]);

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
            loadedStrokes.forEach((stroke) => {
                if (stroke && stroke.id) {
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

    // Initialize from initialStrokes
    useEffect(() => {
        if (initialStrokes && Array.isArray(initialStrokes)) {
            strokes.current.clear();
            initialStrokes.forEach((stroke) => {
                if (stroke && stroke.id) {
                    strokes.current.set(stroke.id, stroke);
                }
            });
            setTimeout(redrawCanvas, 50);
        }
    }, [initialStrokes, redrawCanvas]);

    return {
        currentTool,
        currentColor,
        currentSize,
        currentBoard,
        selectedStrokeId,
        setTool,
        setColor: setCurrentColor,
        setSize: setCurrentSize,
        setBoard: setCurrentBoard,
        clearCanvas,
        clearBoard,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleRemoteMessage,
        setActive,
        addTextStroke,
        addImageStroke,
        deleteSelected,
        getStrokes,
        loadStrokes,
        exportImage,
    };
}
