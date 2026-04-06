/**
 * PdfDocumentViewer — Renders a PDF using react-pdf with the annotation overlay.
 * Layer 1: react-pdf <Page> (read-only document)
 * Layer 2: PdfAnnotationOverlay (fabric.js canvas)
 * Layer 3: Comment pin DOM elements
 */
import React, { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import PdfAnnotationOverlay from './PdfAnnotationOverlay';
import type { AnnotationData, AnnotationTool } from '@/types/speedgrader';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfDocumentViewerProps {
    pdfUrl: string;
    pageNumber: number;
    scale: number;
    annotations: AnnotationData[];
    activeTool: AnnotationTool;
    activeColor: string;
    readOnly?: boolean;
    onDocumentLoaded: (numPages: number) => void;
    onAnnotationCreated: (annotation: Partial<AnnotationData>) => void;
    onAnnotationUpdated?: (annotation: Partial<AnnotationData>) => void;
    onAnnotationDeleted?: (annotationId: string) => void;
    onCommentClick?: (annotation: AnnotationData) => void;
}

export default function PdfDocumentViewer({
    pdfUrl,
    pageNumber,
    scale,
    annotations,
    activeTool,
    activeColor,
    readOnly = false,
    onDocumentLoaded,
    onAnnotationCreated,
    onAnnotationUpdated,
    onAnnotationDeleted,
    onCommentClick,
}: PdfDocumentViewerProps) {
    const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDocumentLoad = useCallback(
        ({ numPages }: { numPages: number }) => {
            onDocumentLoaded(numPages);
            setIsLoading(false);
        },
        [onDocumentLoaded]
    );

    const handlePageRenderSuccess = useCallback(
        (page: any) => {
            const viewport = page.getViewport({ scale });
            setPageSize({ width: viewport.width, height: viewport.height });
        },
        [scale]
    );

    // Comment pins for text_comment annotations on this page
    const commentAnnotations = annotations.filter(
        (a) => a.page_number === pageNumber && a.annotation_type === 'text_comment'
    );

    return (
        <div className="flex items-center justify-center" ref={containerRef}>
            <div className="relative bg-white shadow-xl rounded-sm overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-white/80">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                            <p className="text-sm text-slate-500 font-medium">Loading document...</p>
                        </div>
                    </div>
                )}

                {/* Layer 1: PDF Document */}
                <Document
                    file={pdfUrl}
                    onLoadSuccess={handleDocumentLoad}
                    onLoadError={(err) => console.error('[PdfDocumentViewer] Load error:', err)}
                    loading={null}
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                        onRenderSuccess={handlePageRenderSuccess}
                    />
                </Document>

                {/* Layer 2: Fabric.js Annotation Overlay */}
                {pageSize.width > 0 && (
                    <PdfAnnotationOverlay
                        pageNumber={pageNumber}
                        pageWidth={pageSize.width}
                        pageHeight={pageSize.height}
                        annotations={annotations}
                        activeTool={activeTool}
                        activeColor={activeColor}
                        readOnly={readOnly}
                        onAnnotationCreated={onAnnotationCreated}
                        onAnnotationUpdated={onAnnotationUpdated}
                        onAnnotationDeleted={onAnnotationDeleted}
                    />
                )}

                {/* Layer 3: Comment Pin DOM elements */}
                {commentAnnotations.map((ann) => (
                    <button
                        key={ann.id}
                        className={cn(
                            'absolute z-20 flex items-center justify-center',
                            'w-7 h-7 rounded-full shadow-lg border-2 border-white',
                            'transition-transform hover:scale-125 cursor-pointer',
                            'animate-in fade-in zoom-in-50'
                        )}
                        style={{
                            left: `${ann.x_percent}%`,
                            top: `${ann.y_percent}%`,
                            backgroundColor: ann.color,
                            transform: 'translate(-50%, -50%)',
                        }}
                        onClick={() => onCommentClick?.(ann)}
                        title={ann.comment_text || 'Click to view comment'}
                    >
                        <MessageSquare className="h-3.5 w-3.5 text-white" />
                    </button>
                ))}
            </div>
        </div>
    );
}
