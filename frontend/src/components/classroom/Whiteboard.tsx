/**
 * Whiteboard Component
 * 
 * Interactive canvas whiteboard with drawing tools.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    Pencil,
    Eraser,
    Trash2,
    X,
    Square,
    Circle,
    Sparkles,
    Minus,
    ArrowRight,
    Triangle,
    Star,
    Type,
    Highlighter,
    ImageIcon,
    MousePointer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhiteboard } from '@/hooks/useWhiteboard';
import type { WhiteboardMessage } from '@/types/videoRoom';

interface WhiteboardProps {
    isActive: boolean;
    onClose: () => void;
    sendMessage: (message: WhiteboardMessage) => void;
    onRemoteMessage?: (handler: (message: WhiteboardMessage) => void) => void;
}

const COLORS = [
    '#0ea5e9', // sky-500
    '#0284c7', // sky-600
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // green-500
    '#000000', // black
];

const SIZES = [1, 2, 4, 6, 8, 12, 16, 24, 32];

export function Whiteboard({
    isActive,
    onClose,
    sendMessage,
    onRemoteMessage,
}: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        currentTool,
        currentColor,
        currentSize,
        setTool,
        setColor,
        setSize,
        clearCanvas,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handleRemoteMessage,
        setActive,
        addTextStroke,
        addImageStroke,
        deleteSelected,
        selectedStrokeId,
    } = useWhiteboard({ canvasRef, sendMessage });

    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // Delete handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!showTextInput && !showImageDialog) {
                    deleteSelected();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected, showTextInput, showImageDialog]);

    // Focus text input when it appears
    useEffect(() => {
        if (showTextInput && textInputRef.current) {
            setTimeout(() => textInputRef.current?.focus(), 50);
        }
    }, [showTextInput]);

    const handleCanvasClick = useCallback(
        (e: React.PointerEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (currentTool === 'text') {
                setTextPosition({ x, y });
                setShowTextInput(true);
            } else if (currentTool === 'image') {
                setShowImageDialog(true);
            }
        },
        [currentTool]
    );

    useEffect(() => {
        if (onRemoteMessage) {
            onRemoteMessage(handleRemoteMessage);
        }
    }, [onRemoteMessage, handleRemoteMessage]);

    useEffect(() => {
        setActive(isActive);
    }, [isActive, setActive]);

    // Size canvas to container
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, rect.width, rect.height);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isActive]);

    if (!isActive) return null;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 md:p-3 bg-slate-50 border-b border-slate-200 text-slate-900 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                    {/* Select & Pen Group */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant={currentTool === 'select' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('select')}
                            title="Select & Move"
                            className={currentTool === 'select' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <MousePointer className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'pen' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('pen')}
                            title="Pen"
                            className={currentTool === 'pen' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'rainbow' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('rainbow')}
                            title="Rainbow Pen"
                            className={
                                currentTool === 'rainbow'
                                    ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white'
                                    : 'text-purple-500'
                            }
                        >
                            <Sparkles className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Shapes Group */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant={currentTool === 'rect' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('rect')}
                            className={currentTool === 'rect' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Square className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'circle' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('circle')}
                            className={currentTool === 'circle' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Circle className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'line' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('line')}
                            className={currentTool === 'line' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'arrow' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('arrow')}
                            className={currentTool === 'arrow' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'triangle' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('triangle')}
                            className={currentTool === 'triangle' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Triangle className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'star' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('star')}
                            className={currentTool === 'star' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Star className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'text' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('text')}
                            className={currentTool === 'text' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <Type className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'highlight' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('highlight')}
                            className={currentTool === 'highlight' ? 'bg-yellow-400 hover:bg-yellow-500' : ''}
                        >
                            <Highlighter className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={currentTool === 'image' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('image')}
                            className={currentTool === 'image' ? 'bg-sky-500 hover:bg-sky-600' : ''}
                        >
                            <ImageIcon className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Eraser */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant={currentTool === 'eraser' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('eraser')}
                            className={currentTool === 'eraser' ? 'bg-slate-800 hover:bg-slate-700' : ''}
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Colors */}
                    <div className="hidden md:flex items-center gap-1.5">
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setColor(color)}
                                className={`w-6 h-6 rounded-full transition-transform border border-slate-200 shadow-sm ${currentColor === color ? 'ring-2 ring-offset-2 ring-sky-400 scale-110' : 'hover:scale-110'
                                    }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    <div className="hidden md:block w-px h-6 bg-slate-200 mx-1" />

                    {/* Sizes */}
                    <div className="hidden md:flex items-center gap-1">
                        {SIZES.slice(0, 5).map((size) => (
                            <button
                                key={size}
                                onClick={() => setSize(size)}
                                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${currentSize === size ? 'bg-slate-200 text-black' : 'hover:bg-slate-100 text-slate-400'
                                    }`}
                            >
                                <div className="rounded-full bg-current" style={{ width: size, height: size }} />
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Clear */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCanvas}
                        className="text-red-500 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Close button */}
                <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-white cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onPointerDown={(e) => {
                        if (currentTool === 'text') {
                            e.preventDefault();
                            handleCanvasClick(e);
                        } else if (currentTool === 'image') {
                            setShowImageDialog(true);
                        } else {
                            handlePointerDown(e);
                        }
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="absolute inset-0 touch-none"
                    style={{ touchAction: 'none', pointerEvents: showTextInput ? 'none' : 'auto' }}
                />

                {/* Text Input */}
                {showTextInput && textPosition && (
                    <div
                        className="absolute z-50"
                        style={{ left: textPosition.x, top: textPosition.y }}
                    >
                        <input
                            ref={textInputRef}
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onBlur={(e) => {
                                if (e.currentTarget.value.trim() && textPosition) {
                                    const canvas = canvasRef.current;
                                    if (canvas) {
                                        const rect = canvas.getBoundingClientRect();
                                        addTextStroke(e.currentTarget.value, {
                                            x: textPosition.x / rect.width,
                                            y: textPosition.y / rect.height,
                                        });
                                    }
                                }
                                setTextInput('');
                                setShowTextInput(false);
                                setTextPosition(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    e.preventDefault();
                                    const canvas = canvasRef.current;
                                    if (canvas && textPosition) {
                                        const rect = canvas.getBoundingClientRect();
                                        addTextStroke(e.currentTarget.value, {
                                            x: textPosition.x / rect.width,
                                            y: textPosition.y / rect.height,
                                        });
                                    }
                                    setTextInput('');
                                    setShowTextInput(false);
                                    setTextPosition(null);
                                } else if (e.key === 'Escape') {
                                    setTextInput('');
                                    setShowTextInput(false);
                                    setTextPosition(null);
                                }
                            }}
                            className="bg-white border-2 border-sky-500 rounded px-2 py-1 shadow-lg min-w-[200px]"
                            style={{ fontSize: `${Math.max(currentSize * 4, 16)}px`, color: currentColor }}
                            placeholder="Type here..."
                        />
                    </div>
                )}

                {/* Image Dialog */}
                {showImageDialog && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Image</h3>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setImageFile(file);
                                        setImageUrlInput('');
                                    }
                                }}
                                className="block w-full text-sm text-slate-500 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700"
                            />

                            <div className="relative mb-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-300" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-2 bg-white text-slate-500 text-sm">OR</span>
                                </div>
                            </div>

                            <input
                                type="url"
                                value={imageUrlInput}
                                onChange={(e) => {
                                    setImageUrlInput(e.target.value);
                                    setImageFile(null);
                                }}
                                placeholder="https://example.com/image.jpg"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-6 focus:ring-2 focus:ring-sky-500"
                            />

                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowImageDialog(false);
                                        setImageUrlInput('');
                                        setImageFile(null);
                                        setTool('pen');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        const pos = { x: 0.1, y: 0.1 };
                                        if (imageFile) {
                                            const reader = new FileReader();
                                            reader.onload = (e) => {
                                                const dataUrl = e.target?.result as string;
                                                if (dataUrl) {
                                                    addImageStroke(dataUrl, pos);
                                                    setShowImageDialog(false);
                                                    setImageFile(null);
                                                    setTool('select');
                                                }
                                            };
                                            reader.readAsDataURL(imageFile);
                                        } else if (imageUrlInput.trim()) {
                                            addImageStroke(imageUrlInput.trim(), pos);
                                            setShowImageDialog(false);
                                            setImageUrlInput('');
                                            setTool('select');
                                        }
                                    }}
                                    disabled={!imageFile && !imageUrlInput.trim()}
                                    className="bg-sky-500 hover:bg-sky-600"
                                >
                                    Add Image
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
