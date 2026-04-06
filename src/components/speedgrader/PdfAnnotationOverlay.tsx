/**
 * PdfAnnotationOverlay — The core Canvas Architecture Fix.
 *
 * A transparent fabric.js canvas overlaid on a react-pdf <Page>.
 * All teacher annotations (highlights, drawings, comments) live on
 * this overlay and are stored as standalone JSON metadata.
 * The raw PDF canvas is NEVER modified.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, PencilBrush, FabricObject, util } from 'fabric';
import type { AnnotationData, AnnotationTool } from '@/types/speedgrader';

interface PdfAnnotationOverlayProps {
    pageNumber: number;
    pageWidth: number;
    pageHeight: number;
    annotations: AnnotationData[];
    activeTool: AnnotationTool;
    activeColor: string;
    readOnly?: boolean;
    onAnnotationCreated: (annotation: Partial<AnnotationData>) => void;
    onAnnotationUpdated?: (annotation: Partial<AnnotationData>) => void;
    onAnnotationDeleted?: (annotationId: string) => void;
}

export default function PdfAnnotationOverlay({
    pageNumber,
    pageWidth,
    pageHeight,
    annotations,
    activeTool,
    activeColor,
    readOnly = false,
    onAnnotationCreated,
    onAnnotationUpdated,
    onAnnotationDeleted,
}: PdfAnnotationOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<FabricCanvas | null>(null);
    const isDrawingHighlight = useRef(false);
    const highlightStart = useRef<{ x: number; y: number } | null>(null);
    const activeRect = useRef<Rect | null>(null);

    // Convert pixel coords to percentage
    const toPct = useCallback(
        (px: number, dimension: number) => (px / dimension) * 100,
        []
    );

    // Convert percentage to pixel coords
    const toPx = useCallback(
        (pct: number, dimension: number) => (pct / 100) * dimension,
        []
    );

    // Initialise fabric canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new FabricCanvas(canvasRef.current, {
            width: pageWidth,
            height: pageHeight,
            backgroundColor: 'transparent',
            selection: !readOnly && activeTool === 'select',
            isDrawingMode: !readOnly && activeTool === 'draw',
        });

        fabricRef.current = canvas;

        // Configure drawing brush
        const brush = new PencilBrush(canvas);
        brush.color = activeColor;
        brush.width = 3;
        canvas.freeDrawingBrush = brush;

        return () => {
            canvas.dispose();
            fabricRef.current = null;
        };
    }, [pageWidth, pageHeight]);

    // Render existing annotations as fabric objects
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        // Clear all objects and re-render
        canvas.clear();

        const pageAnnotations = annotations.filter((a) => a.page_number === pageNumber);

        pageAnnotations.forEach((ann) => {
            if (
                ann.annotation_type === 'highlight' ||
                ann.annotation_type === 'area_comment' ||
                ann.annotation_type === 'strikethrough'
            ) {
                const rect = new Rect({
                    left: toPx(ann.x_percent ?? 0, pageWidth),
                    top: toPx(ann.y_percent ?? 0, pageHeight),
                    width: toPx(ann.width_percent ?? 0, pageWidth),
                    height:
                        ann.annotation_type === 'strikethrough'
                            ? 3
                            : toPx(ann.height_percent ?? 0, pageHeight),
                    fill: ann.color + Math.round((ann.opacity ?? 0.35) * 255).toString(16).padStart(2, '0'),
                    stroke: 'transparent',
                    strokeWidth: 0,
                    selectable: !readOnly,
                    evented: !readOnly,
                    lockRotation: true,
                    hasControls: !readOnly,
                    cornerSize: 6,
                    transparentCorners: false,
                    cornerColor: ann.color,
                });

                // Store annotation ID on the fabric object for identification
                (rect as any)._annotationId = ann.id;
                canvas.add(rect);
            }

            if (ann.annotation_type === 'drawing' && ann.drawing_data) {
                try {
                    // Re-hydrate fabric.js path from serialised data
                    util.enlivenObjects([ann.drawing_data]).then((objects: any[]) => {
                        const obj = objects[0];
                        if (obj) {
                            (obj as any)._annotationId = ann.id;
                            obj.selectable = !readOnly;
                            obj.evented = !readOnly;
                            canvas.add(obj);
                            canvas.renderAll();
                        }
                    });
                } catch (err) {
                    console.error('[PdfAnnotationOverlay] Failed to re-hydrate drawing:', err);
                }
            }
        });

        canvas.renderAll();
    }, [annotations, pageNumber, pageWidth, pageHeight, readOnly]);

    // Update canvas mode when tool changes
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || readOnly) return;

        canvas.isDrawingMode = activeTool === 'draw';
        canvas.selection = activeTool === 'select';

        // Disable object selection when not in select mode
        canvas.forEachObject((obj) => {
            obj.selectable = activeTool === 'select' || activeTool === 'eraser';
            obj.evented = activeTool === 'select' || activeTool === 'eraser';
        });

        if (canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.color = activeColor;
            canvas.freeDrawingBrush.width = activeTool === 'draw' ? 3 : 2;
        }

        canvas.renderAll();
    }, [activeTool, activeColor, readOnly]);

    // Handle highlight drawing via mouse events
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || readOnly) return;

        const handleMouseDown = (opt: any) => {
            if (activeTool !== 'highlight' && activeTool !== 'strikethrough') return;

            const pointer = canvas.getScenePoint(opt.e);
            isDrawingHighlight.current = true;
            highlightStart.current = { x: pointer.x, y: pointer.y };

            const rect = new Rect({
                left: pointer.x,
                top: pointer.y,
                width: 0,
                height: activeTool === 'strikethrough' ? 3 : 0,
                fill: activeColor + '59', // 35% opacity
                stroke: 'transparent',
                selectable: false,
                evented: false,
            });

            activeRect.current = rect;
            canvas.add(rect);
        };

        const handleMouseMove = (opt: any) => {
            if (!isDrawingHighlight.current || !highlightStart.current || !activeRect.current) return;

            const pointer = canvas.getScenePoint(opt.e);
            const startX = highlightStart.current.x;
            const startY = highlightStart.current.y;

            const left = Math.min(startX, pointer.x);
            const top = Math.min(startY, pointer.y);
            const width = Math.abs(pointer.x - startX);
            const height = activeTool === 'strikethrough' ? 3 : Math.abs(pointer.y - startY);

            activeRect.current.set({ left, top, width, height });
            canvas.renderAll();
        };

        const handleMouseUp = () => {
            if (!isDrawingHighlight.current || !activeRect.current || !highlightStart.current) return;

            const rect = activeRect.current;
            const width = rect.width ?? 0;
            const height = rect.height ?? 0;

            // Minimum size threshold
            if (width < 5 && height < 5) {
                canvas.remove(rect);
                isDrawingHighlight.current = false;
                highlightStart.current = null;
                activeRect.current = null;
                return;
            }

            onAnnotationCreated({
                annotation_type: activeTool === 'strikethrough' ? 'strikethrough' : 'highlight',
                page_number: pageNumber,
                x_percent: toPct(rect.left ?? 0, pageWidth),
                y_percent: toPct(rect.top ?? 0, pageHeight),
                width_percent: toPct(width, pageWidth),
                height_percent: toPct(height, pageHeight),
                color: activeColor,
                opacity: 0.35,
            });

            // Remove the temporary rect; the persisted version will be rendered via annotations prop
            canvas.remove(rect);

            isDrawingHighlight.current = false;
            highlightStart.current = null;
            activeRect.current = null;
        };

        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:move', handleMouseMove);
            canvas.off('mouse:up', handleMouseUp);
        };
    }, [activeTool, activeColor, pageNumber, pageWidth, pageHeight, readOnly, onAnnotationCreated]);

    // Handle comment placement (click to place pin)
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || readOnly || activeTool !== 'comment') return;

        const handleClick = (opt: any) => {
            const pointer = canvas.getScenePoint(opt.e);
            onAnnotationCreated({
                annotation_type: 'text_comment',
                page_number: pageNumber,
                x_percent: toPct(pointer.x, pageWidth),
                y_percent: toPct(pointer.y, pageHeight),
                color: activeColor,
                opacity: 1,
                comment_text: '',
            });
        };

        canvas.on('mouse:down', handleClick);
        return () => {
            canvas.off('mouse:down', handleClick);
        };
    }, [activeTool, activeColor, pageNumber, pageWidth, pageHeight, readOnly, onAnnotationCreated]);

    // Handle freehand drawing completion
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || readOnly) return;

        const handlePathCreated = (opt: any) => {
            const path = opt.path;
            if (!path) return;

            const serialised = path.toObject();

            onAnnotationCreated({
                annotation_type: 'drawing',
                page_number: pageNumber,
                x_percent: toPct(path.left ?? 0, pageWidth),
                y_percent: toPct(path.top ?? 0, pageHeight),
                width_percent: toPct(path.width ?? 0, pageWidth),
                height_percent: toPct(path.height ?? 0, pageHeight),
                drawing_data: serialised,
                color: activeColor,
                opacity: 1,
            });

            // Remove the live path; persisted version rendered from annotations
            canvas.remove(path);
        };

        canvas.on('path:created', handlePathCreated);
        return () => {
            canvas.off('path:created', handlePathCreated);
        };
    }, [pageNumber, pageWidth, pageHeight, readOnly, activeColor, onAnnotationCreated]);

    // Handle eraser: click an object to delete it
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || readOnly || activeTool !== 'eraser') return;

        const handleSelect = (opt: any) => {
            const target = opt.selected?.[0];
            if (target && (target as any)._annotationId && onAnnotationDeleted) {
                onAnnotationDeleted((target as any)._annotationId);
                canvas.remove(target);
                canvas.discardActiveObject();
                canvas.renderAll();
            }
        };

        canvas.on('selection:created', handleSelect);
        return () => {
            canvas.off('selection:created', handleSelect);
        };
    }, [activeTool, readOnly, onAnnotationDeleted]);

    // Handle object modification (move/resize)
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || readOnly) return;

        const handleModified = (opt: any) => {
            const target = opt.target;
            if (!target || !(target as any)._annotationId) return;

            onAnnotationUpdated?.({
                id: (target as any)._annotationId,
                x_percent: toPct(target.left ?? 0, pageWidth),
                y_percent: toPct(target.top ?? 0, pageHeight),
                width_percent: toPct((target.width ?? 0) * (target.scaleX ?? 1), pageWidth),
                height_percent: toPct((target.height ?? 0) * (target.scaleY ?? 1), pageHeight),
            });
        };

        canvas.on('object:modified', handleModified);
        return () => {
            canvas.off('object:modified', handleModified);
        };
    }, [pageWidth, pageHeight, readOnly, onAnnotationUpdated]);

    return (
        <div 
            className="absolute inset-0 z-10"
            style={{
                pointerEvents: readOnly ? 'none' : 'auto',
            }}
        >
            <canvas ref={canvasRef} />
        </div>
    );
}
