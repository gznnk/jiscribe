import { describe, expect, it } from "vitest";

import { resolveAiRegion } from "../resolveAiRegion";

const rect = { x: 0, y: 0, width: 10, height: 20 };

describe("resolveAiRegion", () => {
	it("reads nothing given as none, leaving the meaning to the tool", () => {
		expect(resolveAiRegion({})).toEqual({
			ok: true,
			region: { kind: "none" },
		});
	});

	it("maps each single field to its region", () => {
		expect(resolveAiRegion({ target: "all" })).toEqual({
			ok: true,
			region: { kind: "all" },
		});
		expect(resolveAiRegion({ target: "selection" })).toEqual({
			ok: true,
			region: { kind: "selection" },
		});
		expect(resolveAiRegion({ ids: ["a", "b"] })).toEqual({
			ok: true,
			region: { kind: "ids", ids: ["a", "b"] },
		});
		expect(resolveAiRegion({ rect })).toEqual({
			ok: true,
			region: { kind: "rect", rect },
		});
	});

	it("refuses any two fields given together, naming all three", () => {
		const pairs = [
			{ target: "all" as const, ids: ["a"] },
			{ target: "selection" as const, rect },
			{ ids: ["a"], rect },
			{ target: "all" as const, ids: ["a"], rect },
		];
		for (const args of pairs) {
			const resolution = resolveAiRegion(args);
			expect(resolution.ok, JSON.stringify(args)).toBe(false);
			expect(resolution.ok ? "" : resolution.text).toContain(
				"at most one of target, ids and rect",
			);
		}
	});
});
