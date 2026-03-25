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
    Layers,
    Shapes,
    ChevronDown,
    Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhiteboard, PEN_THICKNESS_RANGE, PEN_THICKNESS_PRESETS } from '@/hooks/useWhiteboard';
import type { WhiteboardMessage } from '@/types/videoRoom';

interface WhiteboardProps {
    isActive: boolean;
    onClose: () => void;
    sendMessage: (message: WhiteboardMessage) => void;
    onRemoteMessage?: (handler: (message: WhiteboardMessage) => void) => void;
    canEdit?: boolean;
}

const COLORS = [
    '#000000', // Black
    '#ffffff', // White
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#84cc16', // Lime
    '#10b981', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#78716c', // Gray
    '#92400e', // Brown
];

const PRIMARY_COLORS = ['#000000', '#ef4444', '#3b82f6']; // black, red, blue

export function Whiteboard({
    isActive,
    onClose,
    sendMessage,
    onRemoteMessage,
    canEdit = true,
}: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log(`[Whiteboard] Rendered. isActive=${isActive}, canEdit=${canEdit}`);
    }, [isActive, canEdit]);

    const {
        currentTool,
        currentColor,
        currentSize,
        currentBoard,
        setTool,
        setColor,
        setSize,
        setBoard,
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
        selectedStrokeId,
    } = useWhiteboard({ canvasRef, sendMessage });

    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [showShapeSelector, setShowShapeSelector] = useState(false);
    const [showColorSelector, setShowColorSelector] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const shapeSelectorRef = useRef<HTMLDivElement>(null);
    const colorSelectorRef = useRef<HTMLDivElement>(null);

    // Delete handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!canEdit) return;
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

    // Close shape selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (shapeSelectorRef.current && !shapeSelectorRef.current.contains(e.target as Node)) {
                setShowShapeSelector(false);
            }
        };
        if (showShapeSelector) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showShapeSelector]);

    // Close color selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (colorSelectorRef.current && !colorSelectorRef.current.contains(e.target as Node)) {
                setShowColorSelector(false);
            }
        };
        if (showColorSelector) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showColorSelector]);

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
            <div className="flex flex-col md:flex-row md:items-center justify-between p-2 bg-slate-50 border-b border-slate-200 text-slate-900 overflow-visible relative z-10">
                {canEdit && (
                    <div className="flex flex-wrap items-center gap-2 overflow-visible pr-8 md:pr-0">
                    {/* Drawing Tools */}
                    <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant={currentTool === 'select' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('select')}
                            title="Select"
                            className={`h-7 w-7 p-0 ${currentTool === 'select' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                        >
                            <MousePointer className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant={currentTool === 'pen' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('pen')}
                            title="Pen"
                            className={`h-7 w-7 p-0 ${currentTool === 'pen' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant={currentTool === 'eraser' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('eraser')}
                            title="Eraser"
                            className={`h-7 w-7 p-0 ${currentTool === 'eraser' ? 'bg-slate-800 hover:bg-slate-700' : ''}`}
                        >
                            <Eraser className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant={currentTool === 'highlight' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('highlight')}
                            title="Highlight"
                            className={`h-7 w-7 p-0 ${currentTool === 'highlight' ? 'bg-yellow-400 hover:bg-yellow-500' : ''}`}
                        >
                            <Highlighter className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Shapes Selector */}
                    <div className="relative" ref={shapeSelectorRef}>
                        <button
                            onClick={() => setShowShapeSelector(!showShapeSelector)}
                            className={`flex items-center gap-0.5 h-7 px-1.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors ${['rect', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(currentTool)
                                ? 'bg-sky-50 border-sky-300'
                                : ''
                                }`}
                            title="Shapes"
                        >
                            {currentTool === 'rect' && <Square className="w-3.5 h-3.5 text-sky-600" />}
                            {currentTool === 'circle' && <Circle className="w-3.5 h-3.5 text-sky-600" />}
                            {currentTool === 'line' && <Minus className="w-3.5 h-3.5 text-sky-600" />}
                            {currentTool === 'arrow' && <ArrowRight className="w-3.5 h-3.5 text-sky-600" />}
                            {currentTool === 'triangle' && <Triangle className="w-3.5 h-3.5 text-sky-600" />}
                            {currentTool === 'star' && <Star className="w-3.5 h-3.5 text-sky-600" />}
                            {!['rect', 'circle', 'line', 'arrow', 'triangle', 'star'].includes(currentTool) && (
                                <Shapes className="w-3.5 h-3.5 text-slate-600" />
                            )}
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {showShapeSelector && (
                            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg p-1.5 grid grid-cols-3 gap-1 z-[100] min-w-[120px]">
                                <button
                                    onClick={() => {
                                        setTool('rect');
                                        setShowShapeSelector(false);
                                    }}
                                    className={`flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 ${currentTool === 'rect' ? 'bg-sky-100 text-sky-600' : 'text-slate-600'
                                        }`}
                                    title="Rectangle"
                                >
                                    <Square className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setTool('circle');
                                        setShowShapeSelector(false);
                                    }}
                                    className={`flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 ${currentTool === 'circle' ? 'bg-sky-100 text-sky-600' : 'text-slate-600'
                                        }`}
                                    title="Circle"
                                >
                                    <Circle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setTool('line');
                                        setShowShapeSelector(false);
                                    }}
                                    className={`flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 ${currentTool === 'line' ? 'bg-sky-100 text-sky-600' : 'text-slate-600'
                                        }`}
                                    title="Line"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setTool('arrow');
                                        setShowShapeSelector(false);
                                    }}
                                    className={`flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 ${currentTool === 'arrow' ? 'bg-sky-100 text-sky-600' : 'text-slate-600'
                                        }`}
                                    title="Arrow"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setTool('triangle');
                                        setShowShapeSelector(false);
                                    }}
                                    className={`flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 ${currentTool === 'triangle' ? 'bg-sky-100 text-sky-600' : 'text-slate-600'
                                        }`}
                                    title="Triangle"
                                >
                                    <Triangle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setTool('star');
                                        setShowShapeSelector(false);
                                    }}
                                    className={`flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 ${currentTool === 'star' ? 'bg-sky-100 text-sky-600' : 'text-slate-600'
                                        }`}
                                    title="Star"
                                >
                                    <Star className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Text & Image */}
                    <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant={currentTool === 'text' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('text')}
                            title="Text"
                            className={`h-7 w-7 p-0 ${currentTool === 'text' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                        >
                            <Type className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant={currentTool === 'image' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTool('image')}
                            title="Image"
                            className={`h-7 w-7 p-0 ${currentTool === 'image' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Color Selector */}
                    <div className="relative" ref={colorSelectorRef}>
                        <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                            {PRIMARY_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => {
                                        setColor(color);
                                        if (currentTool === 'rainbow') setTool('pen');
                                    }}
                                    className={`w-5 h-5 rounded-full transition-transform border border-slate-200 ${currentColor === color && currentTool !== 'rainbow' ? 'ring-2 ring-offset-1 ring-sky-400 scale-110' : 'hover:scale-110'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    title={color === '#000000' ? 'Black' : color === '#ef4444' ? 'Red' : 'Blue'}
                                />
                            ))}
                            {currentTool === 'rainbow' ? (
                                <button
                                    onClick={() => setShowColorSelector(!showColorSelector)}
                                    className="w-5 h-5 rounded-full border border-slate-200 ring-2 ring-offset-1 ring-sky-400 scale-110 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500"
                                    title="Rainbow"
                                />
                            ) : (
                                <button
                                    onClick={() => setShowColorSelector(!showColorSelector)}
                                    className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors"
                                    title="More colors"
                                >
                                    <Palette className="w-3 h-3 text-slate-600" />
                                </button>
                            )}
                        </div>

                        {showColorSelector && (
                            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg p-2 grid grid-cols-4 gap-1.5 z-[100] min-w-[140px]">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            setColor(color);
                                            if (currentTool === 'rainbow') setTool('pen');
                                            setShowColorSelector(false);
                                        }}
                                        className={`w-7 h-7 rounded-full transition-transform border border-slate-200 ${currentColor === color && currentTool !== 'rainbow' ? 'ring-2 ring-offset-1 ring-sky-400 scale-110' : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <button
                                    onClick={() => {
                                        setTool('rainbow');
                                        setShowColorSelector(false);
                                    }}
                                    className={`w-7 h-7 rounded-full transition-transform border border-slate-200 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 ${currentTool === 'rainbow' ? 'ring-2 ring-offset-1 ring-sky-400 scale-110' : 'hover:scale-110'
                                        }`}
                                    title="Rainbow"
                                >
                                    <Sparkles className="w-3 h-3 text-white drop-shadow" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Size */}
                    <div className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        <input
                            type="range"
                            min={PEN_THICKNESS_RANGE.min}
                            max={PEN_THICKNESS_RANGE.max}
                            step={PEN_THICKNESS_RANGE.step}
                            value={currentSize}
                            onChange={(e) => setSize(Number(e.target.value))}
                            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            title={`Size: ${currentSize}px`}
                        />
                        <span className="text-[10px] text-slate-600 font-medium w-4 text-center">{currentSize}</span>
                    </div>

                    {/* Boards */}
                    <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        {[1, 2, 3, 4, 5].map((board) => (
                            <div key={board} className="relative group">
                                <button
                                    onClick={() => setBoard(board)}
                                    className={`flex items-center justify-center w-6 h-6 rounded transition-all ${currentBoard === board
                                        ? 'bg-sky-500 text-white shadow-sm'
                                        : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                    title={`Board ${board}`}
                                >
                                    <span className="text-[10px] font-semibold">{board}</span>
                                </button>
                                {currentBoard === board && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Clear Board ${board}?`)) {
                                                clearBoard(board);
                                            }
                                        }}
                                        className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        title={`Clear Board ${board}`}
                                    >
                                        <X className="w-2 h-2" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Clear All */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (window.confirm('Clear all boards?')) {
                                clearCanvas();
                            }
                        }}
                        className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
                        title="Clear All"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
                )}

                {/* Close button */}
                <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-2 top-2 md:static md:ml-2">
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
                    style={{ touchAction: 'none', pointerEvents: !canEdit ? 'none' : (showTextInput ? 'none' : 'auto') }}
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
