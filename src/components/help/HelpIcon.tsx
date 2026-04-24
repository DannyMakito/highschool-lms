import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { findHelpSectionForPath, type HelpPortalRole } from "@/lib/help-manual";

type HelpIconProps = {
    title: string;
    description: string;
    details?: string[];
    className?: string;
    ariaLabel?: string;
};

export function HelpIcon({
    title,
    description,
    details = [],
    className,
    ariaLabel = "Open help",
}: HelpIconProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className={className} aria-label={ariaLabel}>
                    <CircleHelp className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {details.length > 0 ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {details.map((detail) => (
                            <p key={detail}>- {detail}</p>
                        ))}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function getPortalRole(role?: string): HelpPortalRole | null {
    if (role === "learner" || role === "teacher" || role === "principal") {
        return role;
    }
    return null;
}

export function RouteHelpIcon() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const portalRole = getPortalRole(user?.role);

    const section = useMemo(() => {
        if (!portalRole) return null;
        return findHelpSectionForPath(portalRole, location.pathname);
    }, [location.pathname, portalRole]);

    const helpPath = useMemo(() => {
        if (!portalRole) return "/";
        const base = portalRole === "learner" ? "/student" : `/${portalRole}`;
        if (!section) return `${base}/help`;
        return `${base}/help#${section.id}`;
    }, [portalRole, section]);

    const details = section?.details ?? ["Open the full help page for this portal to view all user-manual sections."];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <CircleHelp className="h-4 w-4" />
                    Help
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{section?.title || "Page Help"}</DialogTitle>
                    <DialogDescription>
                        {section?.summary || "This page has contextual guidance available in the portal help manual."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm text-muted-foreground">
                    {details.map((detail) => (
                        <p key={detail}>- {detail}</p>
                    ))}
                </div>
                <div className="pt-2">
                    <Button
                        onClick={() => {
                            navigate(helpPath);
                            setIsOpen(false);
                        }}
                    >
                        Open Full Manual
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
