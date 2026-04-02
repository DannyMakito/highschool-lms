
import React from 'react';

interface PortalLoadingScreenProps {
    message?: string;
}

export const PortalLoadingScreen: React.FC<PortalLoadingScreenProps> = ({ 
    message = "Loading your workstation..." 
}) => {
    const [longWait, setLongWait] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setLongWait(true), 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-[9999]">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 animate-ping rounded-full bg-primary" />
                    </div>
                </div>
                <div className="space-y-4 text-center">
                    <div className="space-y-1">
                        <p className="text-xl font-black tracking-tight text-foreground">
                            Afrinexel LMS
                        </p>
                        <p className="text-xs font-bold animate-pulse text-muted-foreground uppercase tracking-[0.3em] pl-1">
                            {message}
                        </p>
                    </div>
                    {longWait && (
                        <p className="text-[10px] text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-1000 max-w-[200px] leading-relaxed italic">
                            Synchronizing with server. This might take a moment if the system was inactive.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
