import { BookOpen, FileText, Home, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";

const navItems = [
  { label: "Home", path: "/student/dashboard", icon: Home },
  { label: "Subjects", path: "/student/subjects", icon: BookOpen },
  { label: "Assignments", path: "/student/assignments", icon: FileText },
  { label: "AI Tutor", path: "/student/tutor", icon: Sparkles },
];

export function StudentBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCompactLayout = useIsTabletOrMobile();

  if (!isCompactLayout) {
    return null;
  }

  const isActivePath = (path: string) => {
    if (path === "/student/dashboard") {
      return location.pathname === path || location.pathname === "/student" || location.pathname.startsWith("/student/dashboard");
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="sticky bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between gap-2 px-3 py-2 sm:px-4">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = isActivePath(path);

          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
