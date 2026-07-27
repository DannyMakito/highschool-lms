import type { ChildSummary } from "../types";

export function getChildById(children: ChildSummary[], childId?: string | string[]) {
  const id = Array.isArray(childId) ? childId[0] : childId;
  if (!id) return null;
  return children.find((child) => child.id === id) ?? null;
}

export function getPrimaryChild(children: ChildSummary[]) {
  return children.find((child) => child.isPrimary) ?? children[0] ?? null;
}
