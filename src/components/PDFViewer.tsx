import React, { useState, useCallback } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Download, Maximize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use local worker to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
    pdfUrl: string;
    fileName?: string;
    onTextSelect?: (selectedText: string) => void;
}

export default function PDFViewer({ pdfUrl, fileName = "Document", onTextSelect }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
        console.log('[PDFViewer] PDF loaded successfully:', { numPages, fileName });
    }, [fileName]);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    
    const handlePrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
    
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        link.click();
    };

    const handleTextSelection = () => {
        const selectedText = window.getSelection()?.toString();
        if (selectedText) {
            onTextSelect?.(selectedText);
            toast.success("📌 Selected text ready for annotation");
        }
    };

    return (
        <div className={`flex flex-col bg-slate-50 ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-lg border shadow-lg h-full'}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white border-b gap-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{fileName}</span>
                    {!isLoading && numPages > 0 && (
                        <span className="text-xs text-slate-500 ml-4">
                            Page <span className="font-semibold">{pageNumber}</span> of <span className="font-semibold">{numPages}</span>
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Navigation */}
                    {numPages > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-slate-100"
                                onClick={handlePrevPage}
                                disabled={pageNumber <= 1}
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-slate-100"
                                onClick={handleNextPage}
                                disabled={pageNumber >= numPages}
                                title="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>

                            <div className="w-px h-6 bg-slate-200" />
                        </>
                    )}

                    {/* Zoom Controls */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-slate-100"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-xs text-slate-600 min-w-[3rem] text-center font-medium">
                        {Math.round(scale * 100)}%
                    </span>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-slate-100"
                        onClick={handleZoomIn}
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-slate-200" />

                    {/* Action Buttons */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-slate-100"
                        onClick={handleDownload}
                        title="Download PDF"
                    >
                        <Download className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-slate-100"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title="Fullscreen"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Display */}
            <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
                {isLoading && (
                    <div className="text-slate-500 flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-sm">Loading PDF...</p>
                    </div>
                )}
                
                <div 
                    className="bg-white shadow-lg rounded-lg overflow-hidden"
                    onMouseUp={handleTextSelection}
                    style={{ maxWidth: '100%' }}
                >
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(error) => {
                            console.error('[PDFViewer] PDF load error:', error);
                            toast.error('Failed to load PDF');
                        }}
                        loading={<div className="p-8 text-center">Loading PDF...</div>}
                    >
                        <Page 
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                        />
                    </Document>
                </div>
            </div>

            {/* Footer Info */}
            <div className="bg-white border-t px-4 py-2 text-xs text-slate-500 shrink-0">
                <p>💡 Tip: Select text with your mouse to add annotations. You can highlight and add comments to your selections.</p>
            </div>
        </div>
    );
}
