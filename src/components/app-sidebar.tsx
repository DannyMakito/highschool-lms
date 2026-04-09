"use client"

import * as React from "react"
import {
  BookOpen,
  LayoutDashboard,
  Users,
  Megaphone,
  GraduationCap,
  FileText,
  MessageSquare,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const roleData = React.useMemo(() => {
    const common = {
      user: {
        name: user?.name || "User",
        email: user?.email || "user@school.com",
        avatar: "",
      },
      teams: [
        {
          name: "Afrinexel LMS",
          logo: GraduationCap,
          plan: user?.role?.toUpperCase() || "PORTAL",
        }
      ]
    };

    switch (user?.role) {
      case "learner":
        return {
          ...common,
          navMain: [
            {
              title: "Dashboard",
              url: "/student/dashboard",
              icon: LayoutDashboard,
              isActive: true,
            },
            {
              title: "My Subjects",
              url: "/student/subjects",
              icon: BookOpen,
            },
            {
              title: "Quizzes",
              url: "/student/quizzes",
              icon: BookOpen,
            },
            {
              title: "Announcements",
              url: "/student/announcements",
              icon: Megaphone,
            },
            {
              title: "Grades",
              url: "/student/grades",
              icon: GraduationCap,
            },
            {
              title: "Assignments",
              url: "/student/assignments",
              icon: FileText,
            },
            {
              title: "Discussions",
              url: "/student/discussions",
              icon: MessageSquare,
            }
          ],
        };
      case "teacher":
        return {
          ...common,
          navMain: [
            {
              title: "Dashboard",
              url: "/teacher/dashboard",
              icon: LayoutDashboard,
              isActive: true,
            },
            {
              title: "Subjects",
              url: "/teacher/subjects",
              icon: BookOpen,
            },
            {
              title: "My Classes",
              url: "/teacher/classes",
              icon: Users,
            },
            {
              title: "Discussions",
              url: "/teacher/discussions",
              icon: MessageSquare,
            },
            {
              title: "Assessments",
              url: "#",
              icon: BookOpen,
              items: [
                { title: "Quizzes", url: "/teacher/assignments/quizzes" },
                { title: "Essays & Research", url: "/teacher/assignments/essays" },
                { title: "Grading Queue", url: "/teacher/assignments/queue" },
              ]
            }

          ],
        };
      case "principal":
        return {
          ...common,
          navMain: [
            {
              title: "Dashboard",
              url: "/principal/dashboard",
              icon: LayoutDashboard,
              isActive: true,
            },
            {
              title: "Subjects",
              url: "/principal/subjects",
              icon: BookOpen,
            },
            {
              title: "Staff Management",
              url: "/principal/teachers",
              icon: Users,
            },
            {
              title: "Registration",
              url: "#",
              icon: GraduationCap,
              items: [
                { title: "Student Registration", url: "/principal/students" },
                { title: "Student Directory", url: "/principal/directory" },
                { title: "Register Classes", url: "/principal/register-classes" },
                { title: "Subject Classes", url: "/principal/subject-classes" },
                { title: "Grade Management", url: "/principal/grades" },
              ]
            },
            {
              title: "School News",
              url: "/principal/announcements",
              icon: Megaphone,
            }
          ],
        };
      default:
        return {
          ...common,
          navMain: [],
        };
    }
  }, [user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={roleData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={roleData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {/* We can pass the logout function to NavUser if needed, or wrap it */}
        <NavUser user={roleData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
