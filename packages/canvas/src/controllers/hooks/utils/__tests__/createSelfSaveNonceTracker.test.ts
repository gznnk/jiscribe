import { describe, expect, it } from "vitest";

import { createSelfSaveNonceTracker } from "../createSelfSaveNonceTracker";

describe("createSelfSaveNonceTracker", () => {
	it("recognizes a registered nonce as a self-save and consumes it", () => {
		const tracker = createSelfSaveNonceTracker();
		tracker.register("nonce-a");
		expect(tracker.consumeIfSelfSave("nonce-a")).toBe(true);
		// A second fold-back with the same nonce is no longer a known self-save.
		expect(tracker.consumeIfSelfSave("nonce-a")).toBe(false);
	});

	it("treats an unknown nonce as a genuine external change", () => {
		const tracker = createSelfSaveNonceTracker();
		tracker.register("nonce-a");
		expect(tracker.consumeIfSelfSave("nonce-other")).toBe(false);
	});

	it("treats an undefined nonce as a genuine external change", () => {
		const tracker = createSelfSaveNonceTracker();
		expect(tracker.consumeIfSelfSave(undefined)).toBe(false);
	});

	// The issue #29 scenario: save A is delivered, then save B is delivered
	// before A's fold-back returns, so the fold-backs arrive B-then-A. A single
	// last-nonce field would already hold B by the time A folds back and would
	// misclassify A as external. The set recognizes both regardless of order.
	it("recognizes fold-backs that return out of order (overlapping saves)", () => {
		const tracker = createSelfSaveNonceTracker();
		tracker.register("nonce-a");
		tracker.register("nonce-b");

		// B folds back first, then A.
		expect(tracker.consumeIfSelfSave("nonce-b")).toBe(true);
		expect(tracker.consumeIfSelfSave("nonce-a")).toBe(true);
	});

	it("evicts the oldest nonce once the pending cap is exceeded", () => {
		const tracker = createSelfSaveNonceTracker();
		// Cap is 64; register 65 so the very first is evicted.
		for (let i = 0; i < 65; i++) {
			tracker.register(`nonce-${i}`);
		}
		// The oldest (nonce-0) was dropped; a later one is still tracked.
		expect(tracker.consumeIfSelfSave("nonce-0")).toBe(false);
		expect(tracker.consumeIfSelfSave("nonce-64")).toBe(true);
	});

	it("trackers are independent instances", () => {
		const trackerA = createSelfSaveNonceTracker();
		const trackerB = createSelfSaveNonceTracker();
		trackerA.register("nonce-a");
		expect(trackerB.consumeIfSelfSave("nonce-a")).toBe(false);
		expect(trackerA.consumeIfSelfSave("nonce-a")).toBe(true);
	});
});
