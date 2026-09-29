import type { SnapCandidate, SnapCandidates } from "../../../../CanvasTypes";

const isCenterOf = (candidate: SnapCandidate, objectId: string): boolean =>
	candidate.objectId === objectId &&
	(candidate.edge === "hCenter" || candidate.edge === "vCenter");

/**
 * Returns the candidates without the given object's hCenter / vCenter entries.
 * Used while editing a poly's vertices, where the object's own center moves with the edit.
 *
 * @param candidates - Sorted candidates; the input is not mutated and the order is kept
 * @param objectId - Object whose center candidates are dropped; its other candidates
 *   (e.g. vertices) stay
 */
export const excludeCenterCandidates = (
	candidates: SnapCandidates,
	objectId: string,
): SnapCandidates => ({
	x: candidates.x.filter((candidate) => !isCenterOf(candidate, objectId)),
	y: candidates.y.filter((candidate) => !isCenterOf(candidate, objectId)),
});
