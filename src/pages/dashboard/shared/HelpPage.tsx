import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { HelpIcon } from "@/components/help/HelpIcon";
import { getHelpManualForRole, type HelpPortalRole } from "@/lib/help-manual";

function getPortalRole(role?: string): HelpPortalRole {
    if (role === "teacher" || role === "principal") return role;
    return "learner";
}

export default function HelpPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const portalRole = getPortalRole(user?.role);
    const manual = getHelpManualForRole(portalRole);

    const activeSectionId = useMemo(() => {
        return location.hash ? location.hash.replace("#", "") : null;
    }, [location.hash]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-2">
                        <BookOpenCheck className="h-8 w-8 text-primary" />
                        Help & User Manual
                    </h1>
                    <p className="text-muted-foreground">{manual.portalTitle}</p>
                </div>
                <HelpIcon
                    title="How to Use Help Icons"
                    description="Every page has a Help button in the top header. Use it for quick, contextual guidance."
                    details={[
                        "Click the header Help button for page-specific guidance.",
                        "Open the full manual to browse all portal features.",
                        "Use section cards below to jump directly to each page.",
                    ]}
                />
            </div>

            <Card className="border-muted/20 bg-card/70">
                <CardHeader>
                    <CardTitle className="text-xl font-black">Manual Overview</CardTitle>
                    <CardDescription>{manual.intro}</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4">
                {manual.sections.map((section) => (
                    <Card
                        key={section.id}
                        id={section.id}
                        className={`border-muted/20 bg-card/70 ${activeSectionId === section.id ? "ring-2 ring-primary/30" : ""}`}
                    >
                        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl">{section.title}</CardTitle>
                                    <Badge variant="outline">{section.path}</Badge>
                                </div>
                                <CardDescription>{section.summary}</CardDescription>
                            </div>
                            <Button onClick={() => navigate(section.path)}>Open Page</Button>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {section.details.map((detail) => (
                                <p key={detail}>- {detail}</p>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
