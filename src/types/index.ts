export type { UserRole } from "@/context/AuthContext";
// Force refresh

export interface Subject {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    gradeTier: "8" | "9" | "10" | "11" | "12";
    modulesCount: number;
    lessonsCount: number;
    category?: string;
    accessType?: "Free" | "Pro" | "Ultra";
    createdAt: string;
}

export interface Topic {
    id: string;
    subjectId: string;
    title: string;
    order: number;
}

export interface Lesson {
    id: string;
    topicId: string;
    title: string;
    content: string; // HTML string from editor
    videoUrl?: string;
    order: number;
}

export type QuestionType = "multiple-choice" | "fill-in-the-blank" | "true-or-false";


export interface QuestionOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    type: QuestionType;
    text: string;
    options: QuestionOption[]; // for multiple choice
    correctAnswer?: string; // for fill in the blank
    points: number;
    estimationTime: number; // in minutes
    isRequired: boolean;
    randomizeOrder: boolean;
    allowMultipleAnswers: boolean;
}

export interface Quiz {
    id: string;
    subjectId: string;
    title: string;
    description: string;
    questions: Question[];
    status: "draft" | "published";
    settingsConfigured: boolean;
    settings: {
        timeLimit: number; // minutes
        allowedAttempts: number;
        passingGrade: number; // percentage
        shuffleQuestions: boolean;
        showAnswers: "immediately" | "after-deadline" | "never";
        availability: {
            startDate: string;
            endDate: string;
        };
        proctoring: {

            preventScreenshots: boolean;
            tabSwitchDetection: boolean;
        };
    };
    createdAt: string;
}

export interface QuizSubmission {
    id: string;
    quizId: string;
    studentId: string;
    studentName: string;
    studentAvatar?: string;
    studentRole?: string;
    score: number;
    accuracy: number;
    timeSpent: number; // in seconds
    status: "completed" | "in-progress" | "need-review";
    completedAt: string;
    answers: {
        questionId: string;
        answer: string | string[];
        isCorrect: boolean;
        pointsEarned: number;
        timeSpent: number;
    }[];
}

export interface QuizAnalytics {
    quizId: string;
    totalSubmissions: number;
    avgAccuracy: number;
    completionRate: number;
    avgTimeSpent: number;
    questionStats: {
        questionId: string;
        correctCount: number;
        incorrectCount: number;
        avgTimeSpent: number;
        responseBreakdown: {
            optionId?: string;
            text: string;
            count: number;
        }[];
    }[];
}



export interface Announcement {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorRole: string;
    createdAt: string;
    targetGrades?: string[]; // e.g. ["8", "9"]
}

export interface RubricCriterion {
    id: string;
    title: string;
    description: string;
    maxPoints: number;
}

export interface Rubric {
    id: string;
    title: string;
    criteria: RubricCriterion[];
}

export interface Assignment {
    id: string;
    subjectId: string;
    title: string;
    description: string;
    totalMarks: number;
    submissionType: "pdf" | "text" | "both";
    isGroup: boolean;
    durationDays: number;
    dueDate: string;
    rubricId?: string;
    status: "draft" | "published";
    createdAt: string;
}

export interface Annotation {
    id: string;
    text: string;
    color?: string;
    type: "note" | "highlight";
    range: {
        start: number;
        end: number;
    };
    authorName: string;
    createdAt: string;
}

export interface AssignmentSubmission {
    id: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string; // Text content or File URL
    fileType: "pdf" | "text";
    status: "submitted" | "graded" | "pending";
    submittedAt: string;
    annotations: Annotation[];
    rubricGrades: Record<string, number>; // criterionId -> score
    overallFeedback: string;
    totalGrade: number;
    isReleased: boolean;
}

export interface Teacher {
    id: string;
    name: string;
    email: string;
    gender: string;
    subjects: string[]; // Subject IDs
    pin: string;
    createdAt: string;
}

// === Registration Module Types ===

export interface Grade {
    id: string;
    name: string; // "Grade 8", "Grade 9", etc.
    level: number; // 8, 9, 10, 11, 12
}

export interface RegisterClass {
    id: string;
    name: string; // "10A", "10B"
    gradeId: string;
    classTeacherId: string; // Teacher ID
    maxStudents: number;
    createdAt: string;
}

export interface SubjectClass {
    id: string;
    subjectId: string;
    name: string; // "PHY10-A", "GEO10-B"
    teacherId: string;
    capacity: number;
    gradeId: string;
    createdAt: string;
}

export interface StudentAssignedSubject {
    subject_id: string;
    subject_name: string;
    grade_tier: string;
}

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    name: string; // computed: firstName + lastName (for backward compat)
    administrationNumber: string;
    gender: string;
    email: string;
    admissionYear: string;
    gradeId: string;
    grade: string; // display value for backward compat
    registerClassId: string;
    studentClass: string; // backward compat
    status: "active" | "inactive" | "transferred";
    pin: string;
    createdAt: string;
    subjects?: StudentAssignedSubject[];
}

export interface StudentSubject {
    id: string;
    studentId: string;
    subjectId: string;
}

export interface StudentSubjectClass {
    id: string;
    studentId: string;
    subjectClassId: string;
}

// Legacy: keeping for backward compat with teacher ClassManagement
export interface SchoolClass {
    id: string;
    name: string;
    teacherId: string;
    subjectId: string;
    studentIds: string[];
    createdAt: string;
}

export * from "./discussions";
