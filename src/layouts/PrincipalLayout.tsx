
import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { SubjectsProvider } from "@/context/SubjectsContext";
import { useSubjects } from "@/hooks/useSubjects";
import { RegistrationDataProvider } from "@/context/RegistrationDataContext";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { SchoolDataProvider } from "@/context/SchoolDataContext";
import { useSchoolData } from "@/hooks/useSchoolData";
import { MessagingProvider } from "@/context/MessagingContext";
import { useMessaging } from "@/hooks/useMessaging";
import { AssignmentsProvider } from "@/context/AssignmentsContext";
import { useAssignments } from "@/hooks/useAssignments";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { RouteHelpIcon } from "@/components/help/HelpIcon";
import { WeeklyFeedbackPrompt } from "@/components/feedback/WeeklyFeedbackPrompt";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PortalLoadingScreen } from "@/components/PortalLoadingScreen";

function PrincipalPortalContent() {
    const { loading: subjectsLoading } = useSubjects();
    const { loading: regLoading } = useRegistrationData();
    const { loading: schoolLoading } = useSchoolData();
    const { loading: msgLoading } = useMessaging();
    const { loading: assignLoading } = useAssignments();

    const isDataLoading = subjectsLoading || regLoading || schoolLoading || msgLoading || assignLoading;

    if (isDataLoading) {
        return <PortalLoadingScreen message="Syncing admin portal..." />;
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">
                                        Afrinexel
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Admin Portal</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="ml-auto pr-4">
                        <RouteHelpIcon />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 mt-4">
                    <WeeklyFeedbackPrompt />
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function PrincipalLayout() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    if (authLoading) {
        return <PortalLoadingScreen message="Verifying session..." />;
    }

    if (!isAuthenticated || user?.role !== 'principal') {
        return <Navigate to="/" replace />;
    }

    return (
        <SubjectsProvider>
            <RegistrationDataProvider>
                <SchoolDataProvider>
                    <MessagingProvider>
                        <AssignmentsProvider>
                            <NotificationsProvider>
                                <NotificationsPopup />
                                <PrincipalPortalContent />
                            </NotificationsProvider>
                        </AssignmentsProvider>
                    </MessagingProvider>
                </SchoolDataProvider>
            </RegistrationDataProvider>
        </SubjectsProvider>
    );
}
