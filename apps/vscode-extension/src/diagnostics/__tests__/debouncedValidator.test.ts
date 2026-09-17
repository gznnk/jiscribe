import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDebouncedValidator } from "../debouncedValidator";

const DELAY_MS = 300;

/** Records the keys handed to `run`, in the order the timers fired. */
function makeRunRecorder(): {
	run: (key: string) => void;
	runKeys: string[];
} {
	const runKeys: string[] = [];
	return { run: (key: string) => runKeys.push(key), runKeys };
}

describe("createDebouncedValidator", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("runs a key once for a burst of requests, after the last one", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.schedule("a");
		vi.advanceTimersByTime(DELAY_MS - 1);
		validator.schedule("a");
		validator.schedule("a");
		expect(runKeys).toEqual([]);

		vi.advanceTimersByTime(DELAY_MS);
		expect(runKeys).toEqual(["a"]);
	});

	it("keeps each key on its own timer", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.schedule("a");
		vi.advanceTimersByTime(DELAY_MS - 100);
		validator.schedule("b");

		vi.advanceTimersByTime(100);
		expect(runKeys).toEqual(["a"]);

		vi.advanceTimersByTime(DELAY_MS);
		expect(runKeys).toEqual(["a", "b"]);
	});

	it("drops a cancelled key and leaves the others pending", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.schedule("a");
		validator.schedule("b");
		validator.cancel("a");

		vi.advanceTimersByTime(DELAY_MS);
		expect(runKeys).toEqual(["b"]);
	});

	it("runs immediately on runNow and forgets the pending run", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.schedule("a");
		validator.runNow("a");
		expect(runKeys).toEqual(["a"]);

		vi.advanceTimersByTime(DELAY_MS);
		expect(runKeys).toEqual(["a"]);
	});

	it("runs on runNow for a key that was never scheduled", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.runNow("a");
		expect(runKeys).toEqual(["a"]);
	});

	it("drops every pending run on dispose", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.schedule("a");
		validator.schedule("b");
		validator.dispose();

		vi.advanceTimersByTime(DELAY_MS);
		expect(runKeys).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("schedules a key again after its run, rather than going quiet", () => {
		const { run, runKeys } = makeRunRecorder();
		const validator = createDebouncedValidator(run, DELAY_MS);

		validator.schedule("a");
		vi.advanceTimersByTime(DELAY_MS);
		validator.schedule("a");
		vi.advanceTimersByTime(DELAY_MS);

		expect(runKeys).toEqual(["a", "a"]);
	});
});
