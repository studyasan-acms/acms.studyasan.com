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
    Save,
    Download,
    Loader2,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Copy,
    ArrowUp,
    ArrowDown,
    Maximize2,
    Table as TableIcon,
    Plus,
    Grid,
    Undo2,
    Redo2,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhiteboard, PEN_THICKNESS_RANGE, PEN_THICKNESS_PRESETS } from '@/hooks/useWhiteboard';
import { compressWhiteboardImage } from '@/utils/whiteboardImage';
import type { WhiteboardMessage } from '@/types/videoRoom';

interface WhiteboardProps {
    isActive: boolean;
    onClose: () => void;
    sendMessage: (message: WhiteboardMessage) => void;
    onRemoteMessage?: (handler: (message: WhiteboardMessage) => void) => (() => void) | void;
    canEdit?: boolean;
    initialStrokes?: any;
    onSave?: (strokes: any[], thumbnail?: string) => void;
    isSaving?: boolean;
    showCloseButton?: boolean;
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
    initialStrokes,
    onSave,
    isSaving = false,
    showCloseButton = true,
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
        eraserType,
        selectedStrokeId,
        selectedStroke,
        canUndo,
        canRedo,
        redrawCanvas,
        setTool,
        setColor,
        setSize,
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
    } = useWhiteboard({ canvasRef, sendMessage, initialStrokes });


    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [showEraserMenu, setShowEraserMenu] = useState(false);
    const [showShapeSelector, setShowShapeSelector] = useState(false);
    const [showColorSelector, setShowColorSelector] = useState(false);
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [hoverGridRows, setHoverGridRows] = useState(3);
    const [hoverGridCols, setHoverGridCols] = useState(3);
    const [editingCell, setEditingCell] = useState<{
        strokeId: string;
        row: number;
        col: number;
        text: string;
        rect: { x: number; y: number; width: number; height: number };
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const cellInputRef = useRef<HTMLInputElement>(null);
    const isAdvancingRef = useRef(false);
    const eraserSelectorRef = useRef<HTMLDivElement>(null);
    const shapeSelectorRef = useRef<HTMLDivElement>(null);
    const colorSelectorRef = useRef<HTMLDivElement>(null);
    const imageSelectorRef = useRef<HTMLDivElement>(null);
    const tableSelectorRef = useRef<HTMLDivElement>(null);

    // Close eraser selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (eraserSelectorRef.current && !eraserSelectorRef.current.contains(e.target as Node)) {
                setShowEraserMenu(false);
            }
        };
        if (showEraserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showEraserMenu]);

    // Delete handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!canEdit) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!showTextInput && !showImageDialog && !showTableDialog && !editingCell) {
                    deleteSelected();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected, showTextInput, showImageDialog, showTableDialog, editingCell, canEdit]);

    // Focus text input when it appears
    useEffect(() => {
        if (showTextInput && textInputRef.current) {
            setTimeout(() => textInputRef.current?.focus(), 50);
        }
    }, [showTextInput]);

    // Focus cell input when editing a table cell without selecting all text on keystroke
    const editingCellKey = editingCell ? `${editingCell.strokeId}-${editingCell.row}-${editingCell.col}` : null;
    const prevCellKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (editingCellKey && editingCellKey !== prevCellKeyRef.current) {
            prevCellKeyRef.current = editingCellKey;
            const timer = setTimeout(() => {
                const input = cellInputRef.current;
                if (input) {
                    input.focus();
                    // Place cursor at the end of text instead of selecting all
                    const len = input.value.length;
                    input.setSelectionRange(len, len);
                }
            }, 30);
            return () => clearTimeout(timer);
        } else if (!editingCellKey) {
            prevCellKeyRef.current = null;
        }
    }, [editingCellKey]);

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

    // Close image selector popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (imageSelectorRef.current && !imageSelectorRef.current.contains(e.target as Node)) {
                setShowImageDialog(false);
            }
        };
        if (showImageDialog) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showImageDialog]);

    // Close table selector popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (tableSelectorRef.current && !tableSelectorRef.current.contains(e.target as Node)) {
                setShowTableDialog(false);
            }
        };
        if (showTableDialog) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showTableDialog]);

    // Handle canvas double-click to edit table cells inline
    const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canEdit) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check active table strokes
        const strokesList = getStrokes().filter(s => (s.board || 1) === currentBoard && s.tool === 'table');
        for (const stroke of strokesList.reverse()) {
            const bounds = getStrokeBoundsForCanvas(stroke);
            if (!bounds) continue;

            if (clickX >= bounds.minX && clickX <= bounds.maxX && clickY >= bounds.minY && clickY <= bounds.maxY) {
                const rows = Math.max(1, stroke.tableRows || 3);
                const cols = Math.max(1, stroke.tableCols || 3);
                const colW = bounds.width / cols;
                const rowH = bounds.height / rows;

                const c = Math.min(cols - 1, Math.max(0, Math.floor((clickX - bounds.minX) / colW)));
                const r = Math.min(rows - 1, Math.max(0, Math.floor((clickY - bounds.minY) / rowH)));

                const cellText = stroke.tableData?.[r]?.[c] || '';
                const cellRect = {
                    x: bounds.minX + c * colW,
                    y: bounds.minY + r * rowH,
                    width: colW,
                    height: rowH,
                };

                setEditingCell({
                    strokeId: stroke.id,
                    row: r,
                    col: c,
                    text: cellText,
                    rect: cellRect,
                });
                return;
            }
        }
    }, [canEdit, currentBoard, getStrokes, getStrokeBoundsForCanvas]);

    // Save cell text and optionally advance focus
    const saveAndAdvanceCell = useCallback((direction: 'next' | 'prev' | 'stay') => {
        if (!editingCell) return;
        updateTableCell(editingCell.strokeId, editingCell.row, editingCell.col, editingCell.text);

        if (direction === 'stay') {
            setEditingCell(null);
            setTimeout(() => {
                isAdvancingRef.current = false;
            }, 50);
            return;
        }

        const stroke = getStrokes().find(s => s.id === editingCell.strokeId);
        if (!stroke || stroke.tool !== 'table') {
            setEditingCell(null);
            return;
        }

        const rows = stroke.tableRows || 3;
        const cols = stroke.tableCols || 3;
        let nextR = editingCell.row;
        let nextC = editingCell.col;

        if (direction === 'next') {
            nextC += 1;
            if (nextC >= cols) {
                nextC = 0;
                nextR += 1;
            }
            if (nextR >= rows) {
                setEditingCell(null);
                return;
            }
        } else if (direction === 'prev') {
            nextC -= 1;
            if (nextC < 0) {
                nextC = cols - 1;
                nextR -= 1;
            }
            if (nextR < 0) {
                setEditingCell(null);
                return;
            }
        }

        const bounds = getStrokeBoundsForCanvas(stroke);
        if (!bounds) {
            setEditingCell(null);
            return;
        }

        const colW = bounds.width / cols;
        const rowH = bounds.height / rows;
        const cellText = stroke.tableData?.[nextR]?.[nextC] || '';

        setEditingCell({
            strokeId: stroke.id,
            row: nextR,
            col: nextC,
            text: cellText,
            rect: {
                x: bounds.minX + nextC * colW,
                y: bounds.minY + nextR * rowH,
                width: colW,
                height: rowH,
            },
        });
    }, [editingCell, updateTableCell, getStrokes, getStrokeBoundsForCanvas]);

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
            const unregister = onRemoteMessage(handleRemoteMessage);
            return () => {
                if (typeof unregister === 'function') {
                    unregister();
                }
            };
        }
    }, [onRemoteMessage, handleRemoteMessage]);

    useEffect(() => {
        setActive(isActive);
    }, [isActive, setActive]);

    // Size canvas to container - also redraw strokes after resize since changing canvas dimensions clears the bitmap
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const dpr = window.devicePixelRatio || 1;
            const canvasWrapper = canvas.parentElement || container;
            const rect = canvasWrapper.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, rect.width, rect.height);
            }

            // Redraw strokes after resize — setting canvas.width/height clears the bitmap
            setTimeout(redrawCanvas, 0);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [isActive, redrawCanvas]);


    if (!isActive) return null;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 flex flex-col bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Toolbar - Single compact row.
                 On mobile: horizontally scrollable so all tools are reachable.
                 Outer div has NO overflow clip so dropdown popups (color, shapes, etc.) show correctly.
                 Only the inner scroll strip clips on X. */}
            <div className="flex items-center gap-1.5 bg-slate-50 border-b border-slate-200 shrink-0 z-20 relative rounded-t-2xl">
                {/* Scrollable tools strip */}
                <div className="flex-1 overflow-x-auto overflow-y-visible scrollbar-hide">
                    <div className="flex items-center gap-1 md:gap-1.5 p-1 md:p-1.5 min-w-max overflow-visible">
                    {!canEdit && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white rounded-lg border border-slate-200 shadow-xs text-slate-600 text-xs font-medium">
                            <span className="font-semibold text-saBlue">Whiteboard</span>
                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded font-medium">View Only</span>
                        </div>
                    )}

                    {canEdit && (
                        <>
                            {/* Undo / Redo Controls */}
                            <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={undo}
                                    disabled={!canUndo}
                                    title="Undo (Ctrl+Z)"
                                    className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={redo}
                                    disabled={!canRedo}
                                    title="Redo (Ctrl+Y)"
                                    className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    <Redo2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            {/* Drawing Tools */}
                            <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                                <Button
                                    variant={currentTool === 'select' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setTool('select');
                                        setShowImageDialog(false);
                                        setShowTableDialog(false);
                                        setShowShapeSelector(false);
                                        setShowColorSelector(false);
                                        setShowEraserMenu(false);
                                    }}
                                    title="Select"
                                    className={`h-7 w-7 p-0 ${currentTool === 'select' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                                >
                                    <MousePointer className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant={currentTool === 'pen' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setTool('pen');
                                        setShowImageDialog(false);
                                        setShowTableDialog(false);
                                        setShowShapeSelector(false);
                                        setShowColorSelector(false);
                                        setShowEraserMenu(false);
                                    }}
                                    title="Pen"
                                    className={`h-7 w-7 p-0 ${currentTool === 'pen' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>

                                {/* Eraser with Object vs Pixel Mode Selector */}
                                <div className="relative" ref={eraserSelectorRef}>
                                    <div className="flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTool('eraser');
                                                setShowImageDialog(false);
                                                setShowTableDialog(false);
                                                setShowShapeSelector(false);
                                                setShowColorSelector(false);
                                            }}
                                            title={`Eraser (${eraserType === 'pixel' ? 'Pixel Eraser - precision stroke trim' : 'Object Eraser - delete whole object'})`}
                                            className={`flex items-center gap-0.5 h-7 px-1.5 rounded transition-colors ${
                                                currentTool === 'eraser'
                                                    ? 'bg-slate-800 text-white shadow-xs'
                                                    : 'text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Eraser className="w-3.5 h-3.5" />
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowEraserMenu(!showEraserMenu);
                                                    setShowImageDialog(false);
                                                    setShowTableDialog(false);
                                                    setShowShapeSelector(false);
                                                    setShowColorSelector(false);
                                                }}
                                                className="p-0.5 hover:bg-white/20 rounded transition-colors cursor-pointer"
                                                title="Choose Eraser Type"
                                            >
                                                <ChevronDown className="w-2.5 h-2.5 opacity-80" />
                                            </span>
                                        </button>
                                    </div>

                                    {showEraserMenu && (
                                        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-[100] min-w-[210px] animate-in fade-in zoom-in-95 duration-150">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                                Eraser Mode
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEraserType('pixel');
                                                    setTool('eraser');
                                                    setShowEraserMenu(false);
                                                }}
                                                className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                                                    eraserType === 'pixel'
                                                        ? 'bg-sky-50 text-sky-950 border border-sky-200'
                                                        : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <div className={`mt-0.5 p-1 rounded ${eraserType === 'pixel' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Eraser className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-semibold flex items-center justify-between">
                                                        <span>Pixel Eraser</span>
                                                        {eraserType === 'pixel' && <Check className="w-3.5 h-3.5 text-sky-600 font-bold" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                        Precision trims strokes & lines where touched
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEraserType('object');
                                                    setTool('eraser');
                                                    setShowEraserMenu(false);
                                                }}
                                                className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors mt-1 ${
                                                    eraserType === 'object'
                                                        ? 'bg-sky-50 text-sky-950 border border-sky-200'
                                                        : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <div className={`mt-0.5 p-1 rounded ${eraserType === 'object' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-semibold flex items-center justify-between">
                                                        <span>Object Eraser</span>
                                                        {eraserType === 'object' && <Check className="w-3.5 h-3.5 text-sky-600 font-bold" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                                        Erases entire stroke, shape, or text on touch
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant={currentTool === 'highlight' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setTool('highlight');
                                        setShowImageDialog(false);
                                        setShowTableDialog(false);
                                        setShowShapeSelector(false);
                                        setShowColorSelector(false);
                                        setShowEraserMenu(false);
                                    }}
                                    title="Highlight"
                                    className={`h-7 w-7 p-0 ${currentTool === 'highlight' ? 'bg-yellow-400 hover:bg-yellow-500' : ''}`}
                                >
                                    <Highlighter className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            {/* Shapes Selector */}
                            <div className="relative" ref={shapeSelectorRef}>
                                <button
                                    onClick={() => {
                                        setShowShapeSelector(!showShapeSelector);
                                        setShowImageDialog(false);
                                        setShowTableDialog(false);
                                        setShowColorSelector(false);
                                    }}
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
                                    onClick={() => {
                                        setTool('text');
                                        setShowImageDialog(false);
                                        setShowTableDialog(false);
                                        setShowShapeSelector(false);
                                        setShowColorSelector(false);
                                    }}
                                    title="Text"
                                    className={`h-7 w-7 p-0 ${currentTool === 'text' ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
                                >
                                    <Type className="w-3.5 h-3.5" />
                                </Button>

                                {/* Image Tool with Tooltip Popover */}
                                <div className="relative" ref={imageSelectorRef}>
                                    <Button
                                        variant={showImageDialog || currentTool === 'image' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => {
                                            const nextState = !showImageDialog;
                                            setShowImageDialog(nextState);
                                            setShowTableDialog(false);
                                            setShowShapeSelector(false);
                                            setShowColorSelector(false);
                                            if (nextState) {
                                                setTool('image');
                                            }
                                        }}
                                        title="Add Image"
                                        className={`h-7 w-7 p-0 ${showImageDialog || currentTool === 'image' ? 'bg-sky-500 hover:bg-sky-600 text-white' : ''}`}
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                    </Button>

                                    {showImageDialog && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-[100] w-[270px] animate-in fade-in zoom-in-95 duration-150">
                                            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                                                    <span className="text-xs font-bold text-slate-800">Add Image</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowImageDialog(false);
                                                        setImageUrlInput('');
                                                        setImageFile(null);
                                                        setTool('pen');
                                                    }}
                                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="space-y-2.5">
                                                {/* File upload input & button */}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const compressedUrl = await compressWhiteboardImage(file);
                                                                if (compressedUrl) {
                                                                    addImageStroke(compressedUrl, { x: 0.25, y: 0.2 });
                                                                    setShowImageDialog(false);
                                                                    setImageFile(null);
                                                                    setImageUrlInput('');
                                                                    setTool('select');
                                                                }
                                                            } catch (err) {
                                                                console.error('[Whiteboard] Image upload error:', err);
                                                            }
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="whiteboard-image-upload-input"
                                                />

                                                <label
                                                    htmlFor="whiteboard-image-upload-input"
                                                    className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/70 hover:bg-sky-50 text-sky-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs"
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                                                    <span>Upload from device</span>
                                                </label>

                                                <div className="relative flex items-center justify-center my-1">
                                                    <div className="w-full border-t border-slate-200" />
                                                    <span className="absolute bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        or URL
                                                    </span>
                                                </div>

                                                {/* Image URL input */}
                                                <div className="flex gap-1.5">
                                                    <input
                                                        type="url"
                                                        value={imageUrlInput}
                                                        onChange={(e) => {
                                                            setImageUrlInput(e.target.value);
                                                            setImageFile(null);
                                                        }}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter' && imageUrlInput.trim()) {
                                                                e.preventDefault();
                                                                const url = imageUrlInput.trim();
                                                                setShowImageDialog(false);
                                                                setImageUrlInput('');
                                                                setTool('select');
                                                                if (url.startsWith('data:image')) {
                                                                    const compressed = await compressWhiteboardImage(url);
                                                                    addImageStroke(compressed || url, { x: 0.25, y: 0.2 });
                                                                } else {
                                                                    addImageStroke(url, { x: 0.25, y: 0.2 });
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Paste image URL..."
                                                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-sky-500 focus:border-sky-500"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={async () => {
                                                            if (imageUrlInput.trim()) {
                                                                const url = imageUrlInput.trim();
                                                                setShowImageDialog(false);
                                                                setImageUrlInput('');
                                                                setTool('select');
                                                                if (url.startsWith('data:image')) {
                                                                    const compressed = await compressWhiteboardImage(url);
                                                                    addImageStroke(compressed || url, { x: 0.25, y: 0.2 });
                                                                } else {
                                                                    addImageStroke(url, { x: 0.25, y: 0.2 });
                                                                }
                                                            }
                                                        }}
                                                        disabled={!imageUrlInput.trim()}
                                                        className="h-auto py-1 px-2.5 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded-lg shrink-0 font-semibold"
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Table Tool with Dimensions Popover */}
                                <div className="relative" ref={tableSelectorRef}>
                                    <Button
                                        variant={showTableDialog || currentTool === 'table' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => {
                                            setShowTableDialog(!showTableDialog);
                                            setShowImageDialog(false);
                                            setShowShapeSelector(false);
                                            setShowColorSelector(false);
                                        }}
                                        title="Insert Table"
                                        className={`h-7 w-7 p-0 ${showTableDialog || currentTool === 'table' ? 'bg-sky-500 hover:bg-sky-600 text-white' : ''}`}
                                    >
                                        <TableIcon className="w-3.5 h-3.5" />
                                    </Button>

                                    {showTableDialog && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 z-[100] w-[290px] animate-in fade-in zoom-in-95 duration-150">
                                            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    <TableIcon className="w-3.5 h-3.5 text-sky-500" />
                                                    <span className="text-xs font-bold text-slate-800">Insert Table</span>
                                                </div>
                                                <button
                                                    onClick={() => setShowTableDialog(false)}
                                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Dynamic Hover Matrix (up to 8 cols x 6 rows) */}
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-500 font-medium">
                                                    <span>Select Dimensions:</span>
                                                    <span className="font-semibold text-sky-600 px-1.5 py-0.5 bg-sky-50 rounded">
                                                        {hoverGridRows} × {hoverGridCols}
                                                    </span>
                                                </div>
                                                <div
                                                    className="grid grid-cols-8 gap-1 p-2 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer"
                                                    onMouseLeave={() => {
                                                        setHoverGridRows(tableRows);
                                                        setHoverGridCols(tableCols);
                                                    }}
                                                >
                                                    {Array.from({ length: 6 }).map((_, rIdx) =>
                                                        Array.from({ length: 8 }).map((_, cIdx) => {
                                                            const isHighlighted = rIdx < hoverGridRows && cIdx < hoverGridCols;
                                                            return (
                                                                <div
                                                                    key={`${rIdx}-${cIdx}`}
                                                                    onMouseEnter={() => {
                                                                        setHoverGridRows(rIdx + 1);
                                                                        setHoverGridCols(cIdx + 1);
                                                                    }}
                                                                    onClick={() => {
                                                                        const r = rIdx + 1;
                                                                        const c = cIdx + 1;
                                                                        setTableRows(r);
                                                                        setTableCols(c);
                                                                        addTableStroke(r, c);
                                                                        setShowTableDialog(false);
                                                                    }}
                                                                    className={`w-5 h-5 rounded-[3px] border transition-all ${
                                                                        isHighlighted
                                                                            ? 'bg-sky-500 border-sky-600 shadow-xs scale-105'
                                                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                />
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stepper Inputs for Rows & Columns */}
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                                        Rows (1-15)
                                                    </label>
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newR = Math.max(1, tableRows - 1);
                                                                setTableRows(newR);
                                                                setHoverGridRows(newR);
                                                            }}
                                                            className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-bold text-slate-800">{tableRows}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newR = Math.min(15, tableRows + 1);
                                                                setTableRows(newR);
                                                                setHoverGridRows(newR);
                                                            }}
                                                            className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                                        Columns (1-15)
                                                    </label>
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newC = Math.max(1, tableCols - 1);
                                                                setTableCols(newC);
                                                                setHoverGridCols(newC);
                                                            }}
                                                            className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-bold text-slate-800">{tableCols}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newC = Math.min(15, tableCols + 1);
                                                                setTableCols(newC);
                                                                setHoverGridCols(newC);
                                                            }}
                                                            className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Presets */}
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <span className="text-[10px] text-slate-400 font-medium mr-0.5">Presets:</span>
                                                {[
                                                    { r: 2, c: 2 },
                                                    { r: 3, c: 3 },
                                                    { r: 4, c: 3 },
                                                    { r: 5, c: 4 },
                                                ].map(p => (
                                                    <button
                                                        key={`${p.r}x${p.c}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setTableRows(p.r);
                                                            setTableCols(p.c);
                                                            setHoverGridRows(p.r);
                                                            setHoverGridCols(p.c);
                                                        }}
                                                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                                                            tableRows === p.r && tableCols === p.c
                                                                ? 'bg-sky-50 border-sky-300 text-sky-700 font-bold'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {p.r}×{p.c}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Insert Action Button */}
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    addTableStroke(tableRows, tableCols);
                                                    setShowTableDialog(false);
                                                }}
                                                className="w-full h-8 text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Insert {tableRows} × {tableCols} Table
                                            </Button>
                                        </div>
                                    )}
                                </div>
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
                                            onClick={() => {
                                                setShowColorSelector(!showColorSelector);
                                                setShowImageDialog(false);
                                                setShowTableDialog(false);
                                                setShowShapeSelector(false);
                                            }}
                                            className="w-5 h-5 rounded-full border border-slate-200 ring-2 ring-offset-1 ring-sky-400 scale-110 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500"
                                            title="Rainbow"
                                        />
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setShowColorSelector(!showColorSelector);
                                                setShowImageDialog(false);
                                                setShowTableDialog(false);
                                                setShowShapeSelector(false);
                                            }}
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
                        </>
                    )}

                    {/* Boards (Available to both Editor and Viewer) */}
                    <div className="flex items-center gap-0.5 bg-white px-0.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                        {[1, 2, 3, 4, 5].map((board) => (
                            <div key={board} className="relative group">
                                <button
                                    onClick={() => setBoard(board, canEdit)}
                                    className={`flex items-center justify-center w-6 h-6 rounded transition-all ${currentBoard === board
                                        ? 'bg-sky-500 text-white shadow-sm'
                                        : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                    title={`Board ${board}`}
                                >
                                    <span className="text-[10px] font-semibold">{board}</span>
                                </button>
                                {canEdit && currentBoard === board && (
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

                    {/* Clear All (Edit only) */}
                    {canEdit && (
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
                    )}

                    {/* Delete Selected (shows when image/text selected and canEdit is true) */}
                    {canEdit && selectedStrokeId && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSelected()}
                            className="text-red-500 hover:bg-red-50 h-7 px-2 text-xs font-medium"
                            title="Delete Selected (Delete key)"
                        >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Delete
                        </Button>
                    )}

                    {/* Export Image button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const dataUrl = exportImage();
                            if (dataUrl) {
                                const link = document.createElement('a');
                                link.download = `whiteboard-board${currentBoard}-${Date.now()}.png`;
                                link.href = dataUrl;
                                link.click();
                            }
                        }}
                        className="text-slate-600 hover:bg-slate-100 h-7 w-7 p-0 sm:w-auto sm:px-2 text-xs font-medium"
                        title="Download as Image"
                    >
                        <Download className="w-3.5 h-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>

                    {/* Save Whiteboard button */}
                    {canEdit && onSave && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                                const currentStrokes = getStrokes();
                                const thumb = exportImage() || undefined;
                                onSave(currentStrokes, thumb);
                            }}
                            disabled={isSaving}
                            className="bg-saBlue hover:bg-saBlue/90 text-white h-7 px-3 text-xs font-semibold shadow-sm"
                            title="Save Whiteboard"
                        >
                            {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            ) : (
                                <Save className="w-3.5 h-3.5 mr-1" />
                            )}
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                </div>
                {/* End scrollable strip */}
                </div>

                {/* Close button (Hidden on phone or when showCloseButton is false) */}
                {showCloseButton && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="hidden md:flex h-7 w-7 p-0 shrink-0 text-slate-500 hover:text-slate-800 mr-1" title="Close Whiteboard">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Canvas - overflow-hidden here to clip drawings to the rounded card */}
            <div className={`flex-1 relative bg-white overflow-hidden rounded-b-2xl ${currentTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}>
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
                    onDoubleClick={handleCanvasDoubleClick}
                    className="absolute inset-0 touch-none"
                    style={{ touchAction: 'none', pointerEvents: !canEdit ? 'none' : (showTextInput ? 'none' : 'auto') }}
                />

                {/* Floating Context Toolbar for Selected Stroke */}
                {canEdit && currentTool === 'select' && selectedStroke && (() => {
                    const bounds = getStrokeBoundsForCanvas(selectedStroke);
                    if (!bounds) return null;
                    const containerW = containerRef.current?.clientWidth || 800;
                    const toolbarTop = Math.max(bounds.minY - 44, 8);
                    const toolbarLeft = Math.min(Math.max(bounds.minX + bounds.width / 2, 160), containerW - 160);

                    return (
                        <div
                            className="absolute z-40 flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-xl px-1 py-0.5 text-slate-700 animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
                            style={{
                                top: `${toolbarTop}px`,
                                left: `${toolbarLeft}px`,
                                transform: 'translateX(-50%)',
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {/* Table-specific Controls */}
                            {selectedStroke.tool === 'table' && (
                                <>
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                                        <TableIcon className="w-3 h-3 text-sky-500" />
                                        <span>{selectedStroke.tableRows || 3}×{selectedStroke.tableCols || 3}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => addTableRow(selectedStroke.id)}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-slate-100 hover:text-sky-600 rounded text-[10px] font-semibold text-slate-600 transition-colors"
                                        title="Add Row to Table"
                                    >
                                        <Plus className="w-2.5 h-2.5 text-sky-500" />
                                        <span>Row</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => removeTableRow(selectedStroke.id)}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-slate-100 hover:text-red-600 rounded text-[10px] font-semibold text-slate-600 transition-colors"
                                        title="Remove Last Row from Table"
                                    >
                                        <Minus className="w-2.5 h-2.5 text-red-500" />
                                        <span>Row</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => addTableCol(selectedStroke.id)}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-slate-100 hover:text-sky-600 rounded text-[10px] font-semibold text-slate-600 transition-colors"
                                        title="Add Column to Table"
                                    >
                                        <Plus className="w-2.5 h-2.5 text-sky-500" />
                                        <span>Col</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => removeTableCol(selectedStroke.id)}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-slate-100 hover:text-red-600 rounded text-[10px] font-semibold text-slate-600 transition-colors"
                                        title="Remove Last Column from Table"
                                    >
                                        <Minus className="w-2.5 h-2.5 text-red-500" />
                                        <span>Col</span>
                                    </button>

                                    <div className="w-[1px] h-3.5 bg-slate-200 my-auto mx-0.5" />
                                </>
                            )}

                            {/* Scale Up */}
                            <button
                                type="button"
                                onClick={() => scaleSelected(1.15)}
                                className="p-1 hover:bg-slate-100 hover:text-sky-600 rounded-lg transition-colors"
                                title="Increase Size (+15%)"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>

                            {/* Scale Down */}
                            <button
                                type="button"
                                onClick={() => scaleSelected(0.85)}
                                className="p-1 hover:bg-slate-100 hover:text-sky-600 rounded-lg transition-colors"
                                title="Decrease Size (-15%)"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Aspect Ratio (Only for images) */}
                            {selectedStroke.tool === 'image' && (
                                <button
                                    type="button"
                                    onClick={() => resetSelectedAspectRatio()}
                                    className="p-1 hover:bg-sky-50 text-sky-600 hover:text-sky-700 rounded-lg transition-colors"
                                    title="Reset Image Aspect Ratio"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Rotate 90° */}
                            <button
                                type="button"
                                onClick={() => rotateSelected(90)}
                                className="p-1 hover:bg-slate-100 hover:text-sky-600 rounded-lg transition-colors"
                                title="Rotate 90° Clockwise"
                            >
                                <RotateCw className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-[1px] h-3.5 bg-slate-200 my-auto mx-0.5" />

                            {/* Duplicate */}
                            <button
                                type="button"
                                onClick={() => duplicateSelected()}
                                className="p-1 hover:bg-slate-100 hover:text-sky-600 rounded-lg transition-colors"
                                title="Duplicate (Clone)"
                            >
                                <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Bring to Front */}
                            <button
                                type="button"
                                onClick={() => bringSelectedToFront()}
                                className="p-1 hover:bg-slate-100 hover:text-sky-600 rounded-lg transition-colors"
                                title="Bring to Front (Layer Up)"
                            >
                                <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Send to Back */}
                            <button
                                type="button"
                                onClick={() => sendSelectedToBack()}
                                className="p-1 hover:bg-slate-100 hover:text-sky-600 rounded-lg transition-colors"
                                title="Send to Back (Layer Down)"
                            >
                                <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-[1px] h-3.5 bg-slate-200 my-auto mx-0.5" />

                            {/* Delete */}
                            <button
                                type="button"
                                onClick={() => deleteSelected()}
                                className="p-1 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors"
                                title="Delete (Delete / Backspace key)"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })()}

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

                {/* Inline Table Cell Editor */}
                {editingCell && (
                    <div
                        className="absolute z-50 animate-in fade-in zoom-in-95 duration-75"
                        style={{
                            left: `${editingCell.rect.x}px`,
                            top: `${editingCell.rect.y}px`,
                            width: `${editingCell.rect.width}px`,
                            height: `${editingCell.rect.height}px`,
                        }}
                    >
                        <input
                            ref={cellInputRef}
                            type="text"
                            value={editingCell.text}
                            onChange={(e) => setEditingCell({ ...editingCell, text: e.target.value })}
                            onBlur={() => {
                                if (isAdvancingRef.current) return;
                                saveAndAdvanceCell('stay');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    isAdvancingRef.current = true;
                                    saveAndAdvanceCell('stay');
                                } else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    isAdvancingRef.current = true;
                                    saveAndAdvanceCell(e.shiftKey ? 'prev' : 'next');
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingCell(null);
                                }
                            }}
                            className={`w-full h-full border-2 border-sky-500 rounded-none px-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-400 ${
                                editingCell.row === 0
                                    ? 'bg-slate-100 font-semibold text-slate-900'
                                    : 'bg-white font-normal text-slate-800'
                            }`}
                            style={{
                                fontSize: `${Math.min(Math.max(11, Math.round(editingCell.rect.height * 0.38)), 20)}px`,
                            }}
                            placeholder="Type..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
