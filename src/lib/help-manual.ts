export type HelpPortalRole = "learner" | "teacher" | "principal";

export type HelpSection = {
    id: string;
    title: string;
    path: string;
    matchPrefixes: string[];
    summary: string;
    details: string[];
};

export type HelpManual = {
    portalTitle: string;
    intro: string;
    sections: HelpSection[];
};

const MANUALS: Record<HelpPortalRole, HelpManual> = {
    learner: {
        portalTitle: "Student Portal Manual",
        intro: "Use this guide to navigate your classes, submit work, track grades, and stay on top of deadlines.",
        sections: [
            {
                id: "student-dashboard",
                title: "Dashboard",
                path: "/student/dashboard",
                matchPrefixes: ["/student/dashboard"],
                summary: "Daily overview of your school activity.",
                details: [
                    "Use dashboard cards to quickly view your activity and priorities.",
                    "Open shortcuts to jump into subjects, quizzes, or assignments.",
                ],
            },
            {
                id: "student-subjects",
                title: "My Subjects",
                path: "/student/subjects",
                matchPrefixes: ["/student/subjects"],
                summary: "Browse assigned subjects and open learning content.",
                details: [
                    "Open a subject to view its lessons, resources, and outline.",
                    "Track your learning progression as you complete content.",
                ],
            },
            {
                id: "student-quizzes",
                title: "Quizzes",
                path: "/student/quizzes",
                matchPrefixes: ["/student/quizzes"],
                summary: "Take available quizzes and review quiz outcomes.",
                details: [
                    "Check quiz availability windows before attempting.",
                    "Open completed quizzes to review marks and performance.",
                ],
            },
            {
                id: "student-grades",
                title: "Grades",
                path: "/student/grades",
                matchPrefixes: ["/student/grades"],
                summary: "Review subject gradebook setup and assessment impact.",
                details: [
                    "See your setup score categories and weighted year-mark impact.",
                    "Open each assessment row for detailed results.",
                ],
            },
            {
                id: "student-assignments",
                title: "Assignments",
                path: "/student/assignments",
                matchPrefixes: ["/student/assignments"],
                summary: "Manage assignment submissions and due dates.",
                details: [
                    "Open tasks to submit online text or files as required.",
                    "Track submission and grading status from the assignment list.",
                ],
            },
            {
                id: "student-register",
                title: "Register Class",
                path: "/student/register",
                matchPrefixes: ["/student/register"],
                summary: "View your register attendance history and weekly class timetable.",
                details: [
                    "If no register class is assigned yet, the page will show a pending-assignment message.",
                    "If your class teacher is not assigned yet, attendance may remain unmarked until assignment.",
                ],
            },
        ],
    },
    teacher: {
        portalTitle: "Teacher Portal Manual",
        intro: "Use this guide to manage classes, mark registers, configure gradebook categories, and track learner progress.",
        sections: [
            {
                id: "teacher-dashboard",
                title: "Dashboard",
                path: "/teacher/dashboard",
                matchPrefixes: ["/teacher/dashboard"],
                summary: "Instructor command center for quick academic access.",
                details: [
                    "Use quick actions to jump to subjects and lesson planning.",
                    "Review high-level teaching metrics and portal readiness.",
                ],
            },
            {
                id: "teacher-classes",
                title: "My Classes",
                path: "/teacher/classes",
                matchPrefixes: ["/teacher/classes"],
                summary: "Open class rosters and inspect learner details and grades.",
                details: [
                    "Use the eye icon to view learner details (PIN hidden by design).",
                    "Use the grades icon for subject-class learner grade snapshots.",
                ],
            },
            {
                id: "teacher-register",
                title: "Register & Timetable",
                path: "/teacher/register-admin",
                matchPrefixes: ["/teacher/register-admin"],
                summary: "Mark daily attendance for your register class and schedule class timetable slots.",
                details: [
                    "Select register class and date, then capture learner attendance marks.",
                    "Use timetable slots to maintain day/period plans as class administrator.",
                    "If you are not assigned as a class teacher yet, this page will remain read-only with guidance.",
                ],
            },
            {
                id: "teacher-assessments",
                title: "Assessments",
                path: "/teacher/assignments/essays",
                matchPrefixes: ["/teacher/assignments/quizzes", "/teacher/assignments/essays", "/teacher/assignments/queue"],
                summary: "Create, configure, and grade assessments with gradebook linking.",
                details: [
                    "Link assignments and quizzes to setup score categories.",
                    "Use grading queue to maintain gradebook setup and learner scores.",
                ],
            },
            {
                id: "teacher-subjects",
                title: "Subjects",
                path: "/teacher/subjects",
                matchPrefixes: ["/teacher/subjects"],
                summary: "Manage curriculum structure, topics, and lesson resources.",
                details: [
                    "Build subject content with topics and lessons.",
                    "Attach learning resources and publish updates to learners.",
                ],
            },
        ],
    },
    principal: {
        portalTitle: "Principal Portal Manual",
        intro: "Use this guide to administer staff, learners, classes, and school-wide academic operations.",
        sections: [
            {
                id: "principal-dashboard",
                title: "Dashboard",
                path: "/principal/dashboard",
                matchPrefixes: ["/principal/dashboard"],
                summary: "Administrative snapshot of school operations.",
                details: [
                    "Review high-level metrics, trends, and quick actions.",
                    "Use dashboard shortcuts to move into administration modules.",
                ],
            },
            {
                id: "principal-analytics",
                title: "Analytics",
                path: "/principal/analytics",
                matchPrefixes: ["/principal/analytics"],
                summary: "Deep analytics for academic and operational decisions.",
                details: [
                    "Monitor progress indicators and cohort performance.",
                    "Use visual trends to guide interventions and planning.",
                ],
            },
            {
                id: "principal-registration",
                title: "Registration & Classes",
                path: "/principal/register-classes",
                matchPrefixes: ["/principal/students", "/principal/register-classes", "/principal/subject-classes", "/principal/directory"],
                summary: "Manage learner registration, class assignment, and directory records.",
                details: [
                    "Create and manage register and subject classes.",
                    "Maintain learner records and class allocations.",
                ],
            },
            {
                id: "principal-grades",
                title: "Grade Management",
                path: "/principal/grades",
                matchPrefixes: ["/principal/grades"],
                summary: "Review class and learner gradebook outcomes.",
                details: [
                    "Audit gradebook setups and weighted learner outcomes.",
                    "Inspect cross-subject performance summaries.",
                ],
            },
            {
                id: "principal-staff",
                title: "Staff Management",
                path: "/principal/teachers",
                matchPrefixes: ["/principal/teachers"],
                summary: "Administer teacher profiles and assignments.",
                details: [
                    "Create and manage teacher accounts and subject allocations.",
                    "Review staffing readiness for classes and subjects.",
                ],
            },
        ],
    },
};

export function getHelpManualForRole(role: HelpPortalRole): HelpManual {
    return MANUALS[role];
}

export function findHelpSectionForPath(role: HelpPortalRole, pathname: string): HelpSection | null {
    const manual = MANUALS[role];
    return manual.sections.find((section) =>
        section.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    ) || null;
}
