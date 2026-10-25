import { describe, expect, it } from "vitest";

import { simplifyPath } from "../simplifyPath";

describe("simplifyPath", () => {
	it("collapses consecutive duplicate points (removes zero-length segments)", () => {
		expect(
			simplifyPath([
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
		]);
	});

	it("collapses monotonic collinear intermediate points (removes pass-through points)", () => {
		expect(
			simplifyPath([
				{ x: 0, y: 0 },
				{ x: 50, y: 0 },
				{ x: 100, y: 0 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		]);
	});

	it("keeps corners (orthogonal bends)", () => {
		const L = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
		];
		expect(simplifyPath(L)).toEqual(L);
	});

	it("preserves reversal (backtracking) intermediate points without collapsing them", () => {
		// 0→100→50 backtracks along the same axis. Kept to preserve the stub's push-out direction.
		const spike = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 50, y: 0 },
		];
		expect(simplifyPath(spike)).toEqual(spike);
	});

	it("returns 2 or fewer points as-is", () => {
		expect(
			simplifyPath([
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			]),
		).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		]);
	});
});
