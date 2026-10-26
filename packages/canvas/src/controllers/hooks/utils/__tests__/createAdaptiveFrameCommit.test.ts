import { describe, expect, it } from "vitest";

import {
	SCHEDULER_PROBE_INTERVAL_FRAMES,
	createAdaptiveFrameCommit,
	IDLE_RESET_MS,
	OVER_BUDGET_FRAMES_TO_FALL_BACK,
	SYNC_COMMIT_BUDGET_MS,
} from "../createAdaptiveFrameCommit";

const FRAME_INTERVAL_MS = 16;
const CHEAP_FRAME_MS = 2;
const HEAVY_FRAME_MS = SYNC_COMMIT_BUDGET_MS + 4;

/**
 * Drives the wrapper with a scripted clock. A frame's cost is modelled by
 * advancing the clock inside `commitSynchronously`, which is the only span the
 * wrapper can measure.
 */
const createHarness = () => {
	let clockMs = 1000;
	let nextFrameCostMs = 0;
	let synchronousCommitCount = 0;
	const wrapFrameDispatch = createAdaptiveFrameCommit({
		commitSynchronously: (work) => {
			synchronousCommitCount++;
			work();
			clockMs += nextFrameCostMs;
		},
		now: () => clockMs,
	});

	/**
	 * Runs one frame and returns whether it was committed synchronously.
	 * Asserts that `dispatchFrame` ran exactly once.
	 */
	const runFrame = (
		costMs: number,
		gapBeforeMs: number = FRAME_INTERVAL_MS,
	): boolean => {
		clockMs += gapBeforeMs;
		nextFrameCostMs = costMs;
		let dispatchCount = 0;
		const commitCountBefore = synchronousCommitCount;
		wrapFrameDispatch(() => {
			dispatchCount++;
		});
		expect(dispatchCount).toBe(1);
		return synchronousCommitCount > commitCountBefore;
	};

	return { runFrame };
};

/** Falls back by running the consecutive over-budget frames that trigger it. */
const fallBack = (runFrame: (costMs: number) => boolean): void => {
	for (let frame = 0; frame < OVER_BUDGET_FRAMES_TO_FALL_BACK; frame++) {
		expect(runFrame(HEAVY_FRAME_MS)).toBe(true);
	}
};

/** Runs the scheduler-committed frames between two probes, asserting none is synchronous. */
const runFramesUntilProbe = (
	runFrame: (costMs: number) => boolean,
	costMs: number,
): void => {
	for (let frame = 1; frame < SCHEDULER_PROBE_INTERVAL_FRAMES; frame++) {
		expect(runFrame(costMs)).toBe(false);
	}
};

describe("createAdaptiveFrameCommit", () => {
	it("commits synchronously while frames stay within budget", () => {
		const { runFrame } = createHarness();
		for (let frame = 0; frame < 100; frame++) {
			expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		}
	});

	it("treats a frame exactly at the budget as within budget", () => {
		const { runFrame } = createHarness();
		for (let frame = 0; frame < 10; frame++) {
			expect(runFrame(SYNC_COMMIT_BUDGET_MS)).toBe(true);
		}
	});

	it("absorbs a single over-budget frame, and a cheap frame resets the streak", () => {
		const { runFrame } = createHarness();
		expect(runFrame(HEAVY_FRAME_MS)).toBe(true);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		expect(runFrame(HEAVY_FRAME_MS)).toBe(true);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
	});

	it("falls back after OVER_BUDGET_FRAMES_TO_FALL_BACK consecutive over-budget frames", () => {
		const { runFrame } = createHarness();
		fallBack(runFrame);
		runFramesUntilProbe(runFrame, HEAVY_FRAME_MS);
	});

	it("probes once per probe interval after falling back and returns to sync when it fits", () => {
		const { runFrame } = createHarness();
		fallBack(runFrame);
		runFramesUntilProbe(runFrame, CHEAP_FRAME_MS);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		// The streak was reset: fewer heavy frames than the threshold do not fall back again.
		for (let frame = 1; frame < OVER_BUDGET_FRAMES_TO_FALL_BACK; frame++) {
			expect(runFrame(HEAVY_FRAME_MS)).toBe(true);
		}
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
	});

	it("stays in fallback when the probe is over budget and probes again one probe interval later", () => {
		const { runFrame } = createHarness();
		fallBack(runFrame);
		runFramesUntilProbe(runFrame, HEAVY_FRAME_MS);
		expect(runFrame(HEAVY_FRAME_MS)).toBe(true);
		runFramesUntilProbe(runFrame, CHEAP_FRAME_MS);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
	});

	it("returns to sync after a gap with no frame longer than IDLE_RESET_MS", () => {
		const { runFrame } = createHarness();
		fallBack(runFrame);
		expect(runFrame(HEAVY_FRAME_MS)).toBe(false);
		expect(runFrame(CHEAP_FRAME_MS, IDLE_RESET_MS + 1)).toBe(true);
		// The streak restarted from zero, so falling back takes the full threshold again.
		for (let frame = 1; frame < OVER_BUDGET_FRAMES_TO_FALL_BACK; frame++) {
			expect(runFrame(HEAVY_FRAME_MS)).toBe(true);
		}
		expect(runFrame(CHEAP_FRAME_MS)).toBe(true);
		fallBack(runFrame);
		expect(runFrame(CHEAP_FRAME_MS)).toBe(false);
	});

	it("does not reset on a gap of exactly IDLE_RESET_MS", () => {
		const { runFrame } = createHarness();
		fallBack(runFrame);
		expect(runFrame(CHEAP_FRAME_MS, IDLE_RESET_MS)).toBe(false);
	});
});
