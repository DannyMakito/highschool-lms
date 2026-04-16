import { useEffect, useMemo, useState } from "react";
import PDFViewer from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkPlus, Download, FileText, Highlighter, PanelRightClose, PanelRightOpen, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

type SavedPdfNote = {
    id: string;
    selectedText: string;
    note: string;
    createdAt: string;
};

interface StudentPdfWorkspaceProps {
    documentId: string;
    pdfUrl: string;
    fileName: string;
    title?: string;
}

const getStorageKey = (documentId: string) => `student-pdf-workspace:${documentId}`;

export default function StudentPdfWorkspace({
    documentId,
    pdfUrl,
    fileName,
    title = "Document Workspace",
}: StudentPdfWorkspaceProps) {
    const [selectedText, setSelectedText] = useState("");
    const [draftNote, setDraftNote] = useState("");
    const [notes, setNotes] = useState<SavedPdfNote[]>([]);
    const [showWorkspace, setShowWorkspace] = useState(true);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(getStorageKey(documentId));
            if (!raw) return;
            const parsed = JSON.parse(raw) as SavedPdfNote[];
            setNotes(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            console.error("Failed to restore PDF workspace", error);
        }
    }, [documentId]);

    const persistNotes = (nextNotes: SavedPdfNote[]) => {
        setNotes(nextNotes);
        localStorage.setItem(getStorageKey(documentId), JSON.stringify(nextNotes));
    };

    const addNote = () => {
        if (!selectedText.trim() && !draftNote.trim()) {
            toast.error("Select some PDF text or write a note first.");
            return;
        }

        const nextNote: SavedPdfNote = {
            id: crypto.randomUUID(),
            selectedText: selectedText.trim(),
            note: draftNote.trim(),
            createdAt: new Date().toISOString(),
        };

        persistNotes([nextNote, ...notes]);
        setSelectedText("");
        setDraftNote("");
        toast.success("PDF draft saved");
    };

    const downloadDraft = () => {
        const payload = {
            fileName,
            savedAt: new Date().toISOString(),
            notes,
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName.replace(/\.pdf$/i, "")}-notes.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const noteCountLabel = useMemo(() => `${notes.length} saved ${notes.length === 1 ? "draft" : "drafts"}`, [notes.length]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-black text-slate-900">{title}</h3>
                    <p className="text-sm text-muted-foreground">Switch between an immersive reading view and your notes workspace whenever you want.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setShowWorkspace((current) => !current)}>
                    {showWorkspace ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}
                    {showWorkspace ? "Hide notes panel" : "Show notes panel"}
                </Button>
            </div>

        <div className={`grid gap-6 ${showWorkspace ? "xl:grid-cols-[minmax(0,1fr)_360px]" : "grid-cols-1"}`}>
            <div className="min-h-[820px]">
                <PDFViewer pdfUrl={pdfUrl} fileName={fileName} onTextSelect={setSelectedText} />
            </div>

            {showWorkspace ? <div className="space-y-4">
                <Card className="border-muted/20 bg-card/80">
                    <CardHeader className="space-y-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Highlighter className="h-5 w-5 text-primary" />
                            {title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Highlight text inside the PDF, add your notes, and keep a draft on this device.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Highlighted Text</label>
                            <Input value={selectedText} readOnly placeholder="Select text in the PDF to capture it here" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes</label>
                            <Textarea
                                value={draftNote}
                                onChange={(event) => setDraftNote(event.target.value)}
                                placeholder="Write your study notes, questions, or reminders"
                                className="min-h-[140px]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={addNote}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Draft
                            </Button>
                            <Button type="button" variant="outline" onClick={downloadDraft} disabled={notes.length === 0}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Draft
                            </Button>
                            <a href={pdfUrl} target="_blank" rel="noreferrer">
                                <Button type="button" variant="ghost">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Open Original
                                </Button>
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-muted/20 bg-card/80">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                                <BookmarkPlus className="h-4 w-4 text-primary" />
                                Saved Drafts
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{noteCountLabel}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {notes.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                No saved notes yet. Select PDF text and save your first draft.
                            </div>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className="rounded-xl border bg-background/80 p-4 space-y-3">
                                    {note.selectedText ? (
                                        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                                            {note.selectedText}
                                        </blockquote>
                                    ) : null}
                                    <p className="text-sm whitespace-pre-wrap">{note.note || "Saved highlight"}</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[11px] text-muted-foreground">
                                            {new Date(note.createdAt).toLocaleString()}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            onClick={() => persistNotes(notes.filter((entry) => entry.id !== note.id))}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div> : null}
        </div>
        </div>
    );
}
