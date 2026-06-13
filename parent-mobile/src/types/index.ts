export type UserRole = "parent";

export interface ParentProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface ChildSummary {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  administrationNumber?: string | null;
  gradeLabel?: string | null;
  classLabel?: string | null;
  status?: string | null;
  relationshipLabel?: string | null;
  isPrimary?: boolean;
}

export interface ChildDetail extends ChildSummary {
  gradeLevel?: number | null;
  gradeName?: string | null;
  className?: string | null;
  subjectCount?: number;
}

export interface ChildSubject {
  id: string;
  name: string;
  gradeTier?: string | null;
  category?: string | null;
}
