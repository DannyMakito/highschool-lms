
import { useState } from "react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Search, Megaphone, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function StudentAnnouncements() {
    const { announcements } = useAnnouncements();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredAnnouncements = announcements.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full px-4 md:px-8 lg:px-12 space-y-8 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <Bell className="h-8 w-8 text-primary" />
                        Notice Board
                    </h1>
                    <p className="text-xl text-muted-foreground mt-2">Stay updated with the latest school news and events.</p>
                </div>
            </div>

            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                    placeholder="Search for notices, events, or updates..."
                    className="pl-12 py-6 text-lg rounded-2xl border-2 transition-all focus-visible:ring-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-6">
                {filteredAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="overflow-hidden border-none shadow-premium bg-card/50 backdrop-blur-sm hover:shadow-premium-hover transition-all duration-300">
                        <CardHeader className="pb-4 relative">
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border-none">
                                    Official
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {format(new Date(announcement.createdAt), "PPP")}
                                </span>
                            </div>
                            <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                                {announcement.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-2">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                                    {announcement.authorName.charAt(0)}
                                </div>
                                <span className="font-semibold text-foreground italic">{announcement.authorName}</span>
                                <span className="text-muted-foreground">• {announcement.authorRole}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="whitespace-pre-wrap text-muted-foreground text-lg leading-relaxed border-l-2 border-primary/20 pl-4 py-2 italic font-medium">
                                {announcement.content}
                            </p>
                        </CardContent>
                    </Card>
                ))}

                {filteredAnnouncements.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
                        <div className="p-6 bg-background rounded-full shadow-lg mb-6">
                            <Megaphone className="h-12 w-12 text-primary opacity-50" />
                        </div>
                        <h3 className="text-2xl font-bold">All Quiet on the Front!</h3>
                        <p className="text-muted-foreground max-w-[300px] mt-2">
                            No announcements found at the moment. Check back later for updates.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
