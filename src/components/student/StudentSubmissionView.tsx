import { useState } from 'react';
import { useAnnotations } from '@/hooks/useAnnotations';
import PdfDocumentViewer from '@/components/speedgrader/PdfDocumentViewer';
import TextDocumentViewer from '@/components/speedgrader/TextDocumentViewer';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, FileText, Search } from 'lucide-react';
import type { AnnotationData } from '@/types/speedgrader';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StudentSubmissionViewProps {
    submissionId: string;
    pdfUrl?: string;
    content?: string;
    fileType: 'pdf' | 'text';
    fileName: string;
}

/**
 * StudentSubmissionView — A clean, read-only viewer for students to see their submitted work.
 * If a teacher has provided annotations/feedback via SpeedGrader, they appear here.
 */
export default function StudentSubmissionView({ submissionId, pdfUrl, content, fileType, fileName }: StudentSubmissionViewProps) {
    const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [scale, setScale] = useState(1.1);

    // Load teacher annotations in real-time
    useAnnotations({
        submissionId,
        onAnnotationsLoaded: setAnnotations,
        onAnnotationInserted: (a) => setAnnotations(prev => [...prev, a]),
        onAnnotationUpdated: (a) => setAnnotations(prev => prev.map(old => old.id === a.id ? a : old)),
        onAnnotationDeleted: (id) => setAnnotations(prev => prev.filter(old => old.id !== id)),
    });

    const isPdf = fileType === 'pdf' && !!pdfUrl;

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Minimalist Navigation Bar */}
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-3 border rounded-2xl shadow-premium-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{fileName}</span>
                    </div>
                    {isPdf && totalPages > 1 && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page</span>
                            <Badge variant="secondary" className="font-black text-xs h-6">
                                {pageNumber} / {totalPages}
                            </Badge>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-1">
                    {isPdf && (
                        <>
                            <div className="flex items-center mr-2 bg-slate-50 rounded-lg border p-0.5">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7" 
                                    onClick={() => setPageNumber(p => Math.max(1, p - 1))} 
                                    disabled={pageNumber <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7" 
                                    onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))} 
                                    disabled={pageNumber >= totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-slate-200 mx-2" />

                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-1 min-w-[3.5rem] justify-center text-[10px] font-black text-slate-600">
                                    <Search className="h-3 w-3" />
                                    {Math.round(scale * 100)}%
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-slate-200 mx-2" />
                        </>
                    )}

                    <a href={isPdf ? pdfUrl : undefined} target="_blank" rel="noreferrer" download={fileName}>
                        <Button variant="outline" size="sm" className="h-8 gap-2 font-bold text-xs rounded-lg border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                            <Download className="h-3.5 w-3.5" />
                            Download Original
                        </Button>
                    </a>
                </div>
            </div>

            {/* Content Area */}
            <div 
                className={cn(
                    "relative min-h-[820px] bg-slate-100/30 rounded-3xl border-2 border-dashed border-slate-200/60 transition-all flex items-stretch p-4 gap-4 overflow-hidden"
                )}
            >
                {/* Main Viewer */}
                <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-white/40 rounded-2xl border border-white/60">
                    {isPdf ? (
                        <div className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-slate-200 rounded-sm">
                            <PdfDocumentViewer
                                pdfUrl={pdfUrl!}
                                pageNumber={pageNumber}
                                scale={scale}
                                annotations={annotations}
                                activeTool="select"
                                activeColor="#3b82f6"
                                readOnly={true}
                                onDocumentLoaded={setTotalPages}
                                onAnnotationCreated={() => {}}
                            />
                        </div>
                    ) : content ? (
                        <div className="w-full max-w-4xl bg-white shadow-premium rounded-2xl overflow-hidden border">
                            <TextDocumentViewer
                                content={content}
                                annotations={annotations}
                                activeTool="select"
                                activeColor="#3b82f6"
                                readOnly={true}
                                onAnnotationCreated={() => {}}
                            />
                        </div>
                    ) : (
                        <div className="text-center p-20">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                               <FileText className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">Unable to load submission content</p>
                        </div>
                    )}
                </div>

                {/* Simplified Comment Gutter */}
                {annotations.some(a => a.comment_text || a.annotation_type === 'text_comment') && (
                    <div className="w-64 shrink-0 flex flex-col gap-3 py-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/70 px-2 flex items-center gap-2">
                            <Search className="h-3 w-3" />
                            Teacher Comments
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {annotations
                                .filter(a => (a.page_number === pageNumber || !isPdf) && (a.comment_text || a.annotation_type === 'text_comment'))
                                .map(ann => (
                                    <div 
                                        key={ann.id} 
                                        className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm animate-in slide-in-from-right-4"
                                        style={{ borderLeft: `4px solid ${ann.color}` }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: ann.color }}>
                                                <Search className="h-2 w-2 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {ann.profiles?.full_name || 'Teacher'}
                                            </span>
                                        </div>
                                        {ann.selected_text && (
                                            <p className="text-[10px] italic text-slate-400 line-clamp-2 mb-1 pl-2 border-l border-slate-100">
                                                "{ann.selected_text}"
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                            {ann.comment_text || "Marked by teacher"}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
