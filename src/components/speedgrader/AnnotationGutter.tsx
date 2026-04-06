/**
 * AnnotationGutter — Side margin showing annotation notes/comments.
 * Displays as a scrollable column next to the document.
 */
import React, { useState } from 'react';
import type { AnnotationData } from '@/types/speedgrader';
import { MessageSquare, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AnnotationGutterProps {
    annotations: AnnotationData[];
    currentPage: number;
    onAnnotationUpdate: (id: string, updates: Partial<AnnotationData>) => void;
    onAnnotationDelete: (id: string) => void;
    readOnly?: boolean;
}

export default function AnnotationGutter({
    annotations,
    currentPage,
    onAnnotationUpdate,
    onAnnotationDelete,
    readOnly = false,
}: AnnotationGutterProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const pageAnnotations = annotations
        .filter((a) => a.page_number === currentPage && (a.comment_text || a.annotation_type === 'text_comment'))
        .sort((a, b) => (a.y_percent ?? 0) - (b.y_percent ?? 0));

    const startEditing = (ann: AnnotationData) => {
        setEditingId(ann.id);
        setEditText(ann.comment_text || '');
    };

    const saveEdit = () => {
        if (editingId) {
            onAnnotationUpdate(editingId, { comment_text: editText });
            setEditingId(null);
            setEditText('');
        }
    };

    if (pageAnnotations.length === 0) {
        return (
            <div className="w-56 shrink-0 pt-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">
                    Comments
                </h3>
                <p className="text-xs text-slate-400 italic px-2">
                    No comments on this page yet.
                </p>
            </div>
        );
    }

    return (
        <div className="w-56 shrink-0 space-y-2 pt-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
                Comments ({pageAnnotations.length})
            </h3>

            {pageAnnotations.map((ann) => (
                <div
                    key={ann.id}
                    className={cn(
                        'p-3 rounded-xl border-l-4 bg-white shadow-sm',
                        'group relative transition-all hover:shadow-md',
                        'animate-in fade-in slide-in-from-right-2'
                    )}
                    style={{ borderLeftColor: ann.color }}
                >
                    {/* Delete button */}
                    {!readOnly && (
                        <button
                            onClick={() => onAnnotationDelete(ann.id)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}

                    {/* Author */}
                    <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3 w-3" style={{ color: ann.color }} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            {ann.profiles?.full_name || 'Instructor'}
                        </span>
                    </div>

                    {/* Selected text preview */}
                    {ann.selected_text && (
                        <p className="text-[10px] italic text-slate-400 line-clamp-1 mb-1 border-l-2 pl-1.5 border-slate-200">
                            "{ann.selected_text}"
                        </p>
                    )}

                    {/* Comment text */}
                    {editingId === ann.id ? (
                        <div className="space-y-1.5">
                            <Textarea
                                autoFocus
                                className="text-xs min-h-[60px] resize-none"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) saveEdit();
                                }}
                            />
                            <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-[10px] flex-1" onClick={saveEdit}>
                                    <Check className="h-3 w-3 mr-1" /> Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px]"
                                    onClick={() => setEditingId(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p
                            className={cn(
                                'text-xs text-slate-700 leading-snug',
                                !readOnly && 'cursor-pointer hover:text-slate-900'
                            )}
                            onClick={() => !readOnly && startEditing(ann)}
                        >
                            {ann.comment_text || (
                                <span className="italic text-slate-400">
                                    {readOnly ? 'No comment' : 'Click to add comment...'}
                                </span>
                            )}
                        </p>
                    )}

                    {/* Timestamp */}
                    <span className="text-[9px] text-slate-300 mt-1 block">
                        {new Date(ann.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
            ))}
        </div>
    );
}
