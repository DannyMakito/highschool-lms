import type { AssignmentGroup, StudentGradebookScore } from "@/types";

export function normalizeMaxPoints(value?: number | null) {
    const nextValue = Number(value ?? 0);
    return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 5;
}

export function clampGradebookScore(value: number, maxPoints: number) {
    return Math.min(normalizeMaxPoints(maxPoints), Math.max(0, value));
}

export function buildGradebookScoreMap(scores: StudentGradebookScore[]) {
    return scores.reduce<Record<string, StudentGradebookScore>>((acc, entry) => {
        acc[`${entry.studentId}:${entry.assignmentGroupId}`] = entry;
        return acc;
    }, {});
}

export function calculateWeightedGradebookTotal(
    groups: AssignmentGroup[],
    scoreMap: Record<string, StudentGradebookScore>,
    studentId: string
) {
    return groups.reduce((sum, group) => {
        const maxPoints = normalizeMaxPoints(group.maxPoints);
        const score = scoreMap[`${studentId}:${group.id}`]?.score ?? 0;
        const normalizedScore = maxPoints > 0 ? score / maxPoints : 0;
        return sum + normalizedScore * group.weightPercentage;
    }, 0);
}
