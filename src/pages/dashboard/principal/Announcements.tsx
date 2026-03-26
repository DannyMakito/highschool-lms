
import { useState } from "react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Button } from "@/components/ui/button";
import { Plus, Search, Trash2, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Announcements() {
    const { announcements, addAnnouncement, deleteAnnouncement } = useAnnouncements();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
    });

    const handleCreate = () => {
        if (!newAnnouncement.title || !newAnnouncement.content) {
            toast.error("Please fill in all fields");
            return;
        }

        addAnnouncement({
            title: newAnnouncement.title,
            content: newAnnouncement.content,
            authorName: user?.name || "Principal",
            authorRole: "Principal",
        });

        setIsDialogOpen(false);
        setNewAnnouncement({ title: "", content: "" });
        toast.success("Announcement posted successfully");
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            deleteAnnouncement(id);
            toast.success("Announcement deleted");
        }
    };

    const filteredAnnouncements = announcements.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
                    <p className="text-muted-foreground">Post updates and news for the school community.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            New Announcement
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                            <DialogTitle>Create New Announcement</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. End of Term Notice"
                                    value={newAnnouncement.title}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="content">Content</Label>
                                <Textarea
                                    id="content"
                                    placeholder="Type your announcement here..."
                                    className="min-h-[150px]"
                                    value={newAnnouncement.content}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Post Announcement</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search announcements..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-6">
                {filteredAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="overflow-hidden border-l-4 border-l-primary">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold">{announcement.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{announcement.authorName}</span>
                                    <span>•</span>
                                    <span>{format(new Date(announcement.createdAt), "PPP p")}</span>
                                </CardDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/90"
                                onClick={() => handleDelete(announcement.id)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                {announcement.content}
                            </p>
                        </CardContent>
                    </Card>
                ))}

                {filteredAnnouncements.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
                        <Megaphone className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <p className="text-muted-foreground max-w-[250px]">
                            No announcements found. Post your first update to get started!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
