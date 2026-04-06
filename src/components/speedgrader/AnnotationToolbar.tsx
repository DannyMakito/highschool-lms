/**
 * AnnotationToolbar — Tool selection bar for the SpeedGrader.
 * Sits above the document viewer.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    MousePointer2,
    Highlighter,
    Pencil,
    MessageSquare,
    Strikethrough,
    Eraser,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationTool } from '@/types/speedgrader';
import { ANNOTATION_COLORS } from '@/types/speedgrader';

interface AnnotationToolbarProps {
    activeTool: AnnotationTool;
    activeColor: string;
    currentPage: number;
    totalPages: number;
    zoomLevel: number;
    isFullscreen: boolean;
    onToolChange: (tool: AnnotationTool) => void;
    onColorChange: (color: string) => void;
    onPageChange: (page: number) => void;
    onZoomChange: (zoom: number) => void;
    onToggleFullscreen: () => void;
}

const tools: { id: AnnotationTool; label: string; icon: React.ElementType; shortcut?: string }[] = [
    { id: 'select', label: 'Select', icon: MousePointer2, shortcut: 'V' },
    { id: 'highlight', label: 'Highlight', icon: Highlighter, shortcut: 'H' },
    { id: 'draw', label: 'Draw', icon: Pencil, shortcut: 'D' },
    { id: 'comment', label: 'Comment', icon: MessageSquare, shortcut: 'C' },
    { id: 'strikethrough', label: 'Strikethrough', icon: Strikethrough, shortcut: 'S' },
    { id: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'E' },
];

export default function AnnotationToolbar({
    activeTool,
    activeColor,
    currentPage,
    totalPages,
    zoomLevel,
    isFullscreen,
    onToolChange,
    onColorChange,
    onPageChange,
    onZoomChange,
    onToggleFullscreen,
}: AnnotationToolbarProps) {
    return (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b gap-2 shrink-0">
            {/* Tools */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {tools.map((tool) => (
                    <Button
                        key={tool.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            'h-8 w-8 p-0 rounded-lg transition-all',
                            activeTool === tool.id
                                ? 'bg-white shadow-sm text-primary ring-1 ring-primary/20'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                        )}
                        onClick={() => onToolChange(tool.id)}
                        title={`${tool.label} (${tool.shortcut})`}
                    >
                        <tool.icon className="h-4 w-4" />
                    </Button>
                ))}
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full">
                {ANNOTATION_COLORS.map((c) => (
                    <button
                        key={c.hex}
                        onClick={() => onColorChange(c.hex)}
                        className={cn(
                            'h-5 w-5 rounded-full transition-all border-2',
                            activeColor === c.hex
                                ? 'scale-125 border-slate-600 shadow-sm'
                                : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                    />
                ))}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    title="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-slate-600 min-w-[4rem] text-center tabular-nums">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    title="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.2))}
                    title="Zoom out"
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-slate-600 min-w-[3rem] text-center tabular-nums">
                    {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onZoomChange(Math.min(3, zoomLevel + 0.2))}
                    title="Zoom in"
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>

            {/* Fullscreen */}
            <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
        </div>
    );
}
