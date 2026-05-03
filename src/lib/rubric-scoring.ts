import type { RubricCriterion } from "@/types";
import type { CriterionGrade } from "@/types/speedgrader";

export function getRubricMaxScore(criteria: RubricCriterion[]) {
    return criteria.reduce((sum, criterion) => {
        const maxPoints = Number(criterion.maxPoints ?? (criterion as { points?: number }).points ?? 0);
        return sum + (Number.isFinite(maxPoints) && maxPoints > 0 ? maxPoints : 0);
    }, 0);
}

export function getRubricRawScore(grades: CriterionGrade[]) {
    return grades.reduce((sum, grade) => {
        const score = Number(grade.score);
        return sum + (Number.isFinite(score) && score > 0 ? score : 0);
    }, 0);
}

export function getScaledRubricScore({
    criteria,
    grades,
    assignmentTotalMarks,
}: {
    criteria: RubricCriterion[];
    grades: CriterionGrade[];
    assignmentTotalMarks: number;
}) {
    const rubricMaxScore = getRubricMaxScore(criteria);
    const rubricRawScore = getRubricRawScore(grades);

    if (rubricMaxScore <= 0) {
        return Number(Math.max(0, Math.min(assignmentTotalMarks || 0, rubricRawScore)).toFixed(2));
    }

    const scaled = (rubricRawScore / rubricMaxScore) * assignmentTotalMarks;
    return Number(Math.max(0, Math.min(assignmentTotalMarks || 0, scaled)).toFixed(2));
}
