import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSaveRequestScheduler } from "../createSaveRequestScheduler";

// The scheduler's backstop timer (setTimeout) is faked here
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

	it("defers a coalescing save until flush (the boundary event)", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		scheduler.schedule(true, notify);
		expect(notify).not.toHaveBeenCalled();

		scheduler.flush();
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("without a boundary event, the 2000ms backstop delivers the save", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		scheduler.schedule(true, notify);
		vi.advanceTimersByTime(1999);
		expect(notify).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(notify).toHaveBeenCalledTimes(1);
	});

	it("a subsequent coalescing save resets the backstop and only the latest notify fires", () => {
		const scheduler = createSaveRequestScheduler();
		const firstNotify = vi.fn();
		const secondNotify = vi.fn();

		scheduler.schedule(true, firstNotify);
		vi.advanceTimersByTime(1500);
		scheduler.schedule(true, secondNotify);
		vi.advanceTimersByTime(1500);
		expect(firstNotify).not.toHaveBeenCalled();
		expect(secondNotify).not.toHaveBeenCalled();

		vi.advanceTimersByTime(500);
		expect(firstNotify).not.toHaveBeenCalled();
		expect(secondNotify).toHaveBeenCalledTimes(1);
	});

	it("a continuous chain delivers nothing until flush, then exactly once", () => {
		const scheduler = createSaveRequestScheduler();
		const notify = vi.fn();

		// Simulates a held arrow key: a coalescing save every 100ms keeps
		// resetting the backstop, so nothing fires mid-chain
		for (let repeat = 0; repeat < 30; repeat += 1) {
			scheduler.schedule(true, notify);
			vi.advanceTimersByTime(100);
		}
		expect(notify).not.toHaveBeenCalled();

		// The key is released (keyup): the boundary flush delivers the final
		// state once, and the cancelled backstop must not deliver again
		scheduler.flush();
		expect(notify).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(2000);
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
		vi.advanceTimersByTime(2000);
		expect(deferredNotify).not.toHaveBeenCalled();
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
