/**
 * useWhiteboard Hook
 * 
 * Canvas drawing state management for the whiteboard feature.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DrawingTool, Stroke, Point, WhiteboardMessage } from '@/types/videoRoom';

interface UseWhiteboardOptions {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    sendMessage: (message: WhiteboardMessage) => void;
}

interface UseWhiteboardReturn {
    currentTool: DrawingTool;
    currentColor: string;
    currentSize: number;
    selectedStrokeId: string | null;
    setTool: (tool: DrawingTool) => void;
    setColor: (color: string) => void;
    setSize: (size: number) => void;
    clearCanvas: () => void;
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
    handleRemoteMessage: (message: WhiteboardMessage) => void;
    setActive: (active: boolean) => void;
    addTextStroke: (text: string, position: Point) => void;
    addImageStroke: (imageUrl: string, position: Point) => void;
    deleteSelected: () => void;
}

function generateStrokeId(): string {
    return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useWhiteboard({ canvasRef, sendMessage }: UseWhiteboardOptions): UseWhiteboardReturn {
    const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
    const [currentColor, setCurrentColor] = useState('#0ea5e9');
    const [currentSize, setCurrentSize] = useState(4);
    const [isActive, setIsActive] = useState(false);
    const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

    const strokes = useRef<Map<string, Stroke>>(new Map());
    const currentStroke = useRef<Stroke | null>(null);
    const isDrawing = useRef(false);
    const rainbowHue = useRef(0);
    const shapeStartPoint = useRef<Point | null>(null);
    const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

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

        // Draw all strokes
        strokes.current.forEach((stroke, strokeId) => {
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
                ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
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

            ctx.restore();
        });
    }, [canvasRef, selectedStrokeId]);

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

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const point = getCanvasPoint(e);
        if (!point) return;

        if (currentTool === 'select') {
            // Find stroke at point
            // Simplified hit detection - expand later
            setSelectedStrokeId(null);
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
                timestamp: Date.now(),
            };
            strokes.current.set(strokeId, currentStroke.current);
        } else {
            const strokeId = generateStrokeId();
            const color = currentTool === 'rainbow'
                ? `hsl(${rainbowHue.current}, 100%, 50%)`
                : currentColor;

            currentStroke.current = {
                id: strokeId,
                tool: currentTool,
                color,
                size: currentSize,
                points: [point],
                timestamp: Date.now(),
            };
            strokes.current.set(strokeId, currentStroke.current);
        }

        redrawCanvas();
    }, [currentTool, currentColor, currentSize, getCanvasPoint, redrawCanvas]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawing.current || !currentStroke.current) return;

        const point = getCanvasPoint(e);
        if (!point) return;

        if (['rect', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(currentTool)) {
            currentStroke.current.points[1] = point;
        } else {
            if (currentTool === 'rainbow') {
                rainbowHue.current = (rainbowHue.current + 2) % 360;
                currentStroke.current.color = `hsl(${rainbowHue.current}, 100%, 50%)`;
            }
            currentStroke.current.points.push(point);
        }

        strokes.current.set(currentStroke.current.id, currentStroke.current);
        redrawCanvas();
    }, [currentTool, getCanvasPoint, redrawCanvas]);

    const handlePointerUp = useCallback(() => {
        if (currentStroke.current) {
            sendMessage({
                type: 'stroke',
                data: currentStroke.current,
                timestamp: Date.now(),
            });
        }

        isDrawing.current = false;
        currentStroke.current = null;
        shapeStartPoint.current = null;
    }, [sendMessage]);

    const handleRemoteMessage = useCallback((message: WhiteboardMessage) => {
        if (message.type === 'stroke' && message.data) {
            const stroke = message.data as Stroke;
            strokes.current.set(stroke.id, stroke);
            redrawCanvas();
        } else if (message.type === 'clear') {
            strokes.current.clear();
            loadedImages.current.clear();
            redrawCanvas();
        }
    }, [redrawCanvas]);

    const clearCanvas = useCallback(() => {
        strokes.current.clear();
        loadedImages.current.clear();
        redrawCanvas();
        sendMessage({
            type: 'clear',
            timestamp: Date.now(),
        });
    }, [redrawCanvas, sendMessage]);

    const addTextStroke = useCallback((text: string, position: Point) => {
        const strokeId = generateStrokeId();
        const stroke: Stroke = {
            id: strokeId,
            tool: 'text',
            color: currentColor,
            size: currentSize,
            points: [position],
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
    }, [currentColor, currentSize, redrawCanvas, sendMessage]);

    const addImageStroke = useCallback((imageUrl: string, position: Point) => {
        const strokeId = generateStrokeId();
        const stroke: Stroke = {
            id: strokeId,
            tool: 'image',
            color: '',
            size: 0,
            points: [position, { x: position.x + 0.2, y: position.y + 0.15 }],
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
    }, [redrawCanvas, sendMessage]);

    const deleteSelected = useCallback(() => {
        if (selectedStrokeId) {
            strokes.current.delete(selectedStrokeId);
            setSelectedStrokeId(null);
            redrawCanvas();
        }
    }, [selectedStrokeId, redrawCanvas]);

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

    return {
        currentTool,
        currentColor,
        currentSize,
        selectedStrokeId,
        setTool,
        setColor: setCurrentColor,
        setSize: setCurrentSize,
        clearCanvas,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleRemoteMessage,
        setActive,
        addTextStroke,
        addImageStroke,
        deleteSelected,
    };
}
