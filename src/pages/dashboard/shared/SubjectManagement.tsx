
import { useState, useMemo } from "react";
import { useSubjects } from "@/hooks/useSubjects";
import { SubjectCard } from "@/components/subjects/SubjectCard";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSchoolData } from "@/hooks/useSchoolData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link, Loader2 } from "lucide-react";
import supabase from "@/lib/supabase";
import { toast } from "sonner";

export default function SubjectManagement() {
    const { subjects: allSubjects, addSubject, deleteSubject, loading: subjectsLoading } = useSubjects();
    const { role, user } = useAuth();
    const { teachers, loading: schoolLoading } = useSchoolData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [newSubject, setNewSubject] = useState<{
        name: string;
        description: string;
        gradeTier: "8" | "9" | "10" | "11" | "12";
        thumbnail: string;
    }>({
        name: "",
        description: "",
        gradeTier: "8",
        thumbnail: "",
    });

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        let timeoutId: number | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId) window.clearTimeout(timeoutId);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }

        setSelectedFile(file);
        // Create local preview URL
        const previewUrl = URL.createObjectURL(file);
        setNewSubject(prev => ({ ...prev, thumbnail: previewUrl }));
        toast.info(`Image "${file.name}" selected`);
    };

    const teacherProfile = useMemo(() => teachers.find(t => t.id === user?.id), [teachers, user?.id]);

    const subjects = useMemo(() => {
        if (role === "principal") return allSubjects;
        if (role === "teacher" && teacherProfile) {
            return allSubjects.filter(s => teacherProfile.subjects.includes(s.id));
        }
        return [];
    }, [allSubjects, role, teacherProfile]);

    const handleCreate = async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            toast.error("You appear to be offline. Please check your internet connection and try again.");
            return;
        }

        // Validation
        if (!newSubject.name.trim() || !newSubject.description.trim() || !newSubject.thumbnail) {
            toast.error("Please fill in all fields (including thumbnail)");
            return;
        }

        setIsUploading(true);
        try {
            let finalThumbnailUrl = newSubject.thumbnail;

            // If we have a local file, upload it now
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt || "png"}`;
                const filePath = `thumbnails/${fileName}`;

                const { error: uploadError } = await withTimeout(
                    supabase.storage
                        .from('subjects')
                        .upload(filePath, selectedFile, { upsert: true }),
                    20000,
                    "Image upload"
                );

                if (uploadError) throw new Error("Failed to upload image: " + uploadError.message);

                const { data } = supabase.storage
                    .from('subjects')
                    .getPublicUrl(filePath);

                if (data?.publicUrl) {
                    finalThumbnailUrl = data.publicUrl;
                }
            }

            // Create subject with final URL
            await withTimeout(
                addSubject({
                    ...newSubject,
                    thumbnail: finalThumbnailUrl
                }),
                20000,
                "Subject creation"
            );

            toast.success("Subject created successfully!");
            setIsDialogOpen(false);

            // Reset state
            setNewSubject({
                name: "",
                description: "",
                gradeTier: "8",
                thumbnail: "",
            });
            setSelectedFile(null);
        } catch (error: any) {
            console.error("Creation error:", error);
            const message =
                error?.name === "AbortError"
                    ? "Request timed out. Check your internet connection, ad-blockers/firewall, and Supabase URL."
                    : (error?.message || "Failed to create subject");
            toast.error(message);
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setNewSubject({
            name: "",
            description: "",
            gradeTier: "8",
            thumbnail: "",
        });
        setSelectedFile(null);
        setIsUploading(false);
    };

    const isAdmin = role === "principal";

    const filteredSubjects = subjects
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
                    <p className="text-muted-foreground">Manage school curriculum and learning materials.</p>
                </div>

                {isAdmin && (
                    <Dialog
                        open={isDialogOpen}
                        onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) resetForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90">
                                <Plus className="mr-2 h-4 w-4" />
                                New Subject
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[480px] p-0">
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle className="text-2xl font-black">Create New Subject</DialogTitle>
                            </DialogHeader>

                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subject Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Mathematics"
                                            value={newSubject.name}
                                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                            className="h-11 border-2 focus-visible:ring-primary font-medium"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                                        <Input
                                            id="description"
                                            placeholder="Brief overview of the subject"
                                            value={newSubject.description}
                                            onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                                            className="h-11 border-2 focus-visible:ring-primary font-medium"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Grade Tier</Label>
                                            <Select
                                                value={newSubject.gradeTier}
                                                onValueChange={(v) => setNewSubject({ ...newSubject, gradeTier: v })}
                                            >
                                                <SelectTrigger className="h-11 border-2 font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["8", "9", "10", "11", "12"].map(g => (
                                                        <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subject Thumbnail</Label>
                                            <Tabs defaultValue="upload" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                                    <TabsTrigger value="upload" className="flex items-center gap-2 font-bold text-xs">
                                                        <Upload className="h-3.5 w-3.5" />
                                                        UPLOAD
                                                    </TabsTrigger>
                                                    <TabsTrigger value="url" className="flex items-center gap-2 font-bold text-xs">
                                                        <Link className="h-3.5 w-3.5" />
                                                        URL
                                                    </TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="upload">
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center justify-center w-full">
                                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                                                                <div className="flex flex-col items-center justify-center">
                                                                    {isUploading ? (
                                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                                                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                                                                                {selectedFile ? selectedFile.name : "Click to select"}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={handleFileUpload}
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </TabsContent>
                                                <TabsContent value="url">
                                                    <div className="grid gap-2">
                                                        <Input
                                                            id="thumbnail"
                                                            placeholder="Paste image URL..."
                                                            value={selectedFile ? "" : newSubject.thumbnail}
                                                            onChange={(e) => {
                                                                setSelectedFile(null);
                                                                setNewSubject({ ...newSubject, thumbnail: e.target.value });
                                                            }}
                                                            className="h-11 border-2"
                                                        />
                                                    </div>
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>
                                    {newSubject.thumbnail && (
                                        <div className="relative aspect-video rounded-xl overflow-hidden border-2 shadow-sm">
                                            <img
                                                src={newSubject.thumbnail}
                                                alt="Preview"
                                                className="object-cover w-full h-full"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="p-6 pt-2">
                                <Button
                                    onClick={handleCreate}
                                    className="w-full h-12 text-lg font-black shadow-lg shadow-primary/20"
                                    disabled={isUploading}
                                >
                                    {isUploading ? "Uploading Image..." : "Create Subject"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search subjects..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSubjects.map((subject) => (
                    <SubjectCard
                        key={subject.id}
                        subject={subject}
                        onClick={() => navigate(`/${role}/subjects/${subject.id}`)}
                        onDelete={isAdmin ? () => {
                            if (window.confirm(`Are you sure you want to delete ${subject.name}? This will also delete all its modules, lessons, and quizzes.`)) {
                                deleteSubject(subject.id);
                            }
                        } : undefined}
                    />
                ))}
                {filteredSubjects.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl">
                        <p className="text-muted-foreground">No subjects found. {isAdmin ? "Start by creating one!" : "Check back later."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
