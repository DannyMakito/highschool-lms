
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Layers, Trash2 } from "lucide-react";
import type { Subject } from "@/types";
import { Button } from "@/components/ui/button";

interface SubjectCardProps {
    subject: Subject;
    onClick?: () => void;
    onDelete?: (e: React.MouseEvent) => void;
}

export function SubjectCard({ subject, onClick, onDelete }: SubjectCardProps) {
    return (
        <Card
            className="overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur-sm border-muted/20 relative"
            onClick={onClick}
        >
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={subject.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                    alt={subject.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-md text-foreground border-none">
                    Grade {subject.gradeTier}
                </Badge>
                {onDelete && (
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 left-2 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg scale-90 group-hover:scale-100"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(e);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <CardContent className="p-4 space-y-2">
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{subject.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {subject.description}
                </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex gap-4 text-xs text-muted-foreground font-medium border-t border-muted/10 mt-auto">
                <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{subject.modulesCount} modules</span>
                </div>
                <div className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{subject.lessonsCount} lessons</span>
                </div>
            </CardFooter>
        </Card>
    );
}
