/**
 * TextDocumentViewer — Read-only rich text renderer with annotation overlay.
 * For text submissions, annotations are rendered as DOM-based highlights.
 */
import React, { useMemo, useCallback, useRef } from 'react';
import type { AnnotationData, AnnotationTool } from '@/types/speedgrader';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextDocumentViewerProps {
    content: string;
    annotations: AnnotationData[];
    activeTool: AnnotationTool;
    activeColor: string;
    readOnly?: boolean;
    onAnnotationCreated: (annotation: Partial<AnnotationData>) => void;
    onAnnotationDeleted?: (annotationId: string) => void;
    onCommentClick?: (annotation: AnnotationData) => void;
}

export default function TextDocumentViewer({
    content,
    annotations,
    activeTool,
    activeColor,
    readOnly = false,
    onAnnotationCreated,
    onAnnotationDeleted,
    onCommentClick,
}: TextDocumentViewerProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    // Filter to text-range-based annotations (page 1)
    const textAnnotations = useMemo(
        () =>
            annotations.filter(
                (a) =>
                    a.text_range_start !== undefined &&
                    a.text_range_end !== undefined &&
                    (a.annotation_type === 'highlight' || a.annotation_type === 'text_comment')
            ),
        [annotations]
    );

    // Build rendered segments with highlights
    const renderedContent = useMemo(() => {
        if (!textAnnotations.length) return [{ text: content, annotation: null as AnnotationData | null }];

        const sorted = [...textAnnotations].sort(
            (a, b) => (a.text_range_start ?? 0) - (b.text_range_start ?? 0)
        );

        const segments: { text: string; annotation: AnnotationData | null }[] = [];
        let lastIndex = 0;

        sorted.forEach((ann) => {
            const start = ann.text_range_start ?? 0;
            const end = ann.text_range_end ?? 0;

            if (start > lastIndex) {
                segments.push({ text: content.slice(lastIndex, start), annotation: null });
            }
            segments.push({ text: content.slice(start, end), annotation: ann });
            lastIndex = Math.max(lastIndex, end);
        });

        if (lastIndex < content.length) {
            segments.push({ text: content.slice(lastIndex), annotation: null });
        }

        return segments;
    }, [content, textAnnotations]);

    // Handle text selection for creating annotations
    const handleMouseUp = useCallback(() => {
        if (readOnly) return;
        if (activeTool !== 'highlight' && activeTool !== 'comment') return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        const contentDiv = contentRef.current;
        if (!contentDiv || !contentDiv.contains(range.commonAncestorContainer)) return;

        // Calculate character offsets within the content
        const preRange = document.createRange();
        preRange.selectNodeContents(contentDiv);
        preRange.setEnd(range.startContainer, range.startOffset);
        const start = preRange.toString().length;
        const selectedText = sel.toString();
        const end = start + selectedText.length;

        if (selectedText.trim().length === 0) return;

        onAnnotationCreated({
            annotation_type: activeTool === 'comment' ? 'text_comment' : 'highlight',
            page_number: 1,
            text_range_start: start,
            text_range_end: end,
            selected_text: selectedText,
            color: activeColor,
            opacity: 0.35,
            comment_text: activeTool === 'comment' ? '' : undefined,
        });

        sel.removeAllRanges();
    }, [readOnly, activeTool, activeColor, onAnnotationCreated]);

    return (
        <div className="bg-white shadow-xl rounded-sm overflow-hidden max-w-3xl mx-auto">
            {/* Document Content */}
            <div className="px-12 py-10">
                <div
                    ref={contentRef}
                    className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed text-[17px] text-slate-700 font-serif selection:bg-blue-200/50"
                    onMouseUp={handleMouseUp}
                    style={{ cursor: activeTool === 'highlight' || activeTool === 'comment' ? 'text' : 'default' }}
                >
                    {renderedContent.map((segment, i) => {
                        if (!segment.annotation) {
                            return <React.Fragment key={i}>{segment.text}</React.Fragment>;
                        }

                        const ann = segment.annotation;
                        return (
                            <span
                                key={ann.id}
                                className={cn(
                                    'relative inline group/ann transition-all rounded-sm',
                                    !readOnly && 'cursor-pointer'
                                )}
                                style={{
                                    backgroundColor: ann.color + '59', // ~35% opacity
                                    borderBottom: `2px solid ${ann.color}`,
                                }}
                                onClick={() => {
                                    if (activeTool === 'eraser' && onAnnotationDeleted) {
                                        onAnnotationDeleted(ann.id);
                                    } else {
                                        onCommentClick?.(ann);
                                    }
                                }}
                            >
                                {segment.text}
                                {ann.annotation_type === 'text_comment' && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                            style={{ backgroundColor: ann.color }}
                                        />
                                        <span
                                            className="relative inline-flex rounded-full h-3 w-3 border border-white"
                                            style={{ backgroundColor: ann.color }}
                                        >
                                            <MessageSquare className="h-2 w-2 text-white m-auto" />
                                        </span>
                                    </span>
                                )}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
