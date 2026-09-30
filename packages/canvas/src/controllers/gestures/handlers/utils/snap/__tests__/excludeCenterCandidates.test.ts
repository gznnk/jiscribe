import { describe, expect, it } from "vitest";

import type {
	SnapCandidate,
	SnapCandidates,
	SnapEdge,
} from "../../../../../CanvasTypes";
import { excludeCenterCandidates } from "../excludeCenterCandidates";

const candidate = (
	objectId: string,
	coordinate: number,
	edge: SnapEdge,
): SnapCandidate => ({
	objectId,
	coordinate,
	edge,
	perpendicularMin: 0,
	perpendicularMax: 0,
});

const candidates: SnapCandidates = {
	x: [
		candidate("self", 0, "vertex"),
		candidate("other", 10, "left"),
		candidate("self", 20, "hCenter"),
		candidate("other", 30, "hCenter"),
		candidate("self", 40, "vertex"),
	],
	y: [
		candidate("other", 5, "top"),
		candidate("self", 15, "vCenter"),
		candidate("self", 25, "vertex"),
		candidate("other", 35, "vCenter"),
	],
};

describe("excludeCenterCandidates", () => {
	it("drops only the given object's hCenter / vCenter and keeps the order", () => {
		const result = excludeCenterCandidates(candidates, "self");

		expect(result.x).toEqual([
			candidate("self", 0, "vertex"),
			candidate("other", 10, "left"),
			candidate("other", 30, "hCenter"),
			candidate("self", 40, "vertex"),
		]);
		expect(result.y).toEqual([
			candidate("other", 5, "top"),
			candidate("self", 25, "vertex"),
			candidate("other", 35, "vCenter"),
		]);
	});

	it("does not mutate the input", () => {
		excludeCenterCandidates(candidates, "self");

		expect(candidates.x).toHaveLength(5);
		expect(candidates.y).toHaveLength(4);
	});
});
