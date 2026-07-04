import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSaveRequestScheduler } from "../createSaveRequestScheduler";

// The scheduler's trailing timer (setTimeout) is faked here
beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createSaveRequestScheduler", () => {
	it("delivers a non-coalescing save immediately", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		scheduler.schedule(false, notify);
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("defers a coalescing save with a 500ms trailing debounce", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		scheduler.schedule(true, notify);
		expect(notify).not.toHaveBeenCalled();

		vi.advanceTimersByTime(499);
		expect(notify).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("a subsequent coalescing save resets the debounce and only the latest notify fires", () => {
		const scheduler = createSaveRequestScheduler();
		const firstNotify = vi.fn();
		const secondNotify = vi.fn();

		scheduler.schedule(true, firstNotify);
		vi.advanceTimersByTime(400);
		scheduler.schedule(true, secondNotify);
		vi.advanceTimersByTime(400);
		expect(firstNotify).not.toHaveBeenCalled();
		expect(secondNotify).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(firstNotify).not.toHaveBeenCalled();
		expect(secondNotify).toHaveBeenCalledTimes(1);
	});

	it("a continuous chain delivers nothing until it stops, then exactly once", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		// Simulates a held arrow key: a coalescing save every 100ms keeps
		// resetting the trailing timer, so nothing fires mid-chain
		for (let repeat = 0; repeat < 30; repeat += 1) {
			scheduler.schedule(true, notify);
			vi.advanceTimersByTime(100);
		}
		expect(notify).not.toHaveBeenCalled();

		// The key is released: the trailing debounce delivers the final state once
		vi.advanceTimersByTime(400);
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("a non-coalescing save cancels the pending deferred delivery and fires immediately", () => {
		const scheduler = createSaveRequestScheduler();
		const deferredNotify = vi.fn();
		const immediateNotify = vi.fn();

		scheduler.schedule(true, deferredNotify);
		scheduler.schedule(false, immediateNotify);
		expect(immediateNotify).toHaveBeenCalledTimes(1);

		// The deferred one is dropped (the immediate save already covers its content)
		vi.advanceTimersByTime(1000);
		expect(deferredNotify).not.toHaveBeenCalled();
	});

	it("flush delivers a pending save immediately and exactly once", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		scheduler.schedule(true, notify);
		scheduler.flush();
		expect(notify).toHaveBeenCalledTimes(1);

		// The cancelled timer must not deliver a second time
		vi.advanceTimersByTime(1000);
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("flush with nothing pending is a no-op", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		scheduler.schedule(false, notify);
		expect(notify).toHaveBeenCalledTimes(1);

		scheduler.flush();
		expect(notify).toHaveBeenCalledTimes(1);
	});
});
