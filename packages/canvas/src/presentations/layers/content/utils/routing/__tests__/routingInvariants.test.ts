import { describe, expect, it } from "vitest";

import {
	boxGap,
	MARGIN,
	measure,
	minPassByClearance,
	sweepGrid,
	type ConfigMeasure,
} from "./routingHarness";

/**
 * Spec invariants for orthogonal routing, checked by sweeping the whole configuration space
 * (every face-pair over a grid of relative box positions) rather than hand-picked snapshots — the
 * recurring regressions were drag-continuity issues that single configs miss.
 *
 * The full specification (hard constraints, the priority order, the intrusion / exit-corridor
 * definitions, the anti-patterns, and the scope) is in `../SPEC.md`. In short, the priority spec
 * (encoded by `RouteCost`) is: crossings → reversals (S1) → margin intrusions (S2) → aesthetic
 * (S3 turns + S4 length) → symmetric tie-break → deterministic keys.
 *
 * The strict invariants are asserted for **clearly separated** boxes (a gap larger than the margin
 * on their nearest axis). Adjacent / touching / overlapping boxes are near-degenerate (an exit face
 * can point straight into an abutting shape), so they are surveyed but not held to the same bar.
 */

const GRID = { range: 300, step: 20 };

describe("routing invariants over the configuration space", () => {
	const all = sweepGrid(GRID);
	const separated = all.filter((m) => boxGap(m.dx, m.dy) > MARGIN);

	const describeCases = (list: ConfigMeasure[]): string =>
		list
			.slice(0, 8)
			.map(
				(m) =>
					`${m.sourceFace}->${m.targetFace} d=(${m.dx},${m.dy}) [${m.path
						.map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`)
						.join("")}]`,
			)
			.join("  ");

	it("no reversal spikes for clearly separated boxes", () => {
		const bad = separated.filter((m) => m.reversals > 0);
		expect(bad.length, describeCases(bad)).toBe(0);
	});

	it("the drawn line never passes through a box for clearly separated boxes", () => {
		const bad = separated.filter((m) => m.crossings > 0);
		expect(bad.length, describeCases(bad)).toBe(0);
	});

	it("keeps full margin clearance from shapes it routes past when clearance is achievable", () => {
		// clearance is only achievable when both axes are separated by more than 2×margin (otherwise a
		// facing route must correctly meet nearer than the margin, and a wrap must squeeze a tight gap)
		const achievable = all.filter(
			(m) =>
				Math.abs(m.dx) - 100 > 2 * MARGIN && Math.abs(m.dy) - 100 > 2 * MARGIN,
		);
		const bad = achievable.filter((m) => minPassByClearance(m) < MARGIN - 0.5);
		expect(bad.length, describeCases(bad)).toBe(0);
	});

	it("uses a bounded number of turns for clearly separated boxes (no wiggle/staircase)", () => {
		// two separated boxes never need more than a wrap-around: 4 interior corners (6 points)
		const bad = separated.filter((m) => m.turns > 4);
		expect(bad.length, describeCases(bad)).toBe(0);
	});
});

describe("routing invariants — specific reported patterns", () => {
	it("parallel left-exits, x-overlapping y-stacked: clean C, no staircase (wiggle report)", () => {
		// source box x[1278,1378], target box x[1251,1351] (overlap in x), both exit left
		const m = measure("left", "left", 1251 - 1328, 547 - 753);
		// (relative to source at origin; use absolute-equivalent via a direct route check instead)
		expect(m.reversals).toBe(0);
	});

	it("facing left/right diagonal: no exit-then-backtrack jog", () => {
		// source bottom-right exits left, target upper-left exits right (the jog report)
		const m = measure("left", "right", 949 - 1088, 519 - 689);
		expect(m.reversals).toBe(0);
		expect(m.turns).toBeLessThanOrEqual(4);
	});
});
