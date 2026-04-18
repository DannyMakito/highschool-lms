import type { UserRole } from "@/context/AuthContext";

export function getRolePathPrefix(role: UserRole) {
  if (role === "learner") return "/student";
  if (role === "teacher") return "/teacher";
  if (role === "principal") return "/principal";
  return "";
}
