
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RoleLayout() {
    const { user, isAuthenticated, loading } = useAuth();

    // Always show loader while we are verifying session or profile
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-bold animate-pulse text-primary uppercase tracking-[0.2em]">
                        Verifying Session...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // The specific layout wrapping is handled by the route configuration 
    // or we can switch here. But standard React Router pattern usually 
    // nests these. 
    // However, for a "Switcher", we can do:

    switch (user?.role) {
        case "learner":
            return <Navigate to="/student/dashboard" replace />;
        case "teacher":
            return <Navigate to="/teacher/dashboard" replace />;
        case "principal":
            return <Navigate to="/principal/dashboard" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
}
