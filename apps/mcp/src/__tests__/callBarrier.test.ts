import { describe, expect, it } from "vitest";

import { createCallBarrier } from "../callBarrier";

/** A promise settled from outside, for holding a tracked call in the air */
const createDeferred = (): {
	promise: Promise<void>;
	resolve: () => void;
	reject: (error: Error) => void;
} => {
	let resolve: () => void = () => {};
	let reject: (error: Error) => void = () => {};
	const promise = new Promise<void>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
};

/** Lets every callback already queued run, so a wait that could settle has */
const drainCallbacks = async (): Promise<void> => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("createCallBarrier", () => {
	it("holds a waiter until the calls tracked before it have settled", async () => {
		const barrier = createCallBarrier();
		const earlierCall = createDeferred();
		void barrier.track(() => earlierCall.promise);

		let isWaitOver = false;
		void barrier.waitForTrackedCalls().then(() => {
			isWaitOver = true;
		});
		await drainCallbacks();
		expect(isWaitOver).toBe(false);

		earlierCall.resolve();
		await drainCallbacks();
		expect(isWaitOver).toBe(true);
	});

	it("does not hold a waiter for a call tracked after it", async () => {
		const barrier = createCallBarrier();
		const waiting = barrier.waitForTrackedCalls();
		const laterCall = createDeferred();
		void barrier.track(() => laterCall.promise);

		await expect(waiting).resolves.toBeUndefined();
		laterCall.resolve();
	});

	it("lets a waiter through a call that failed, and passes the failure to its caller", async () => {
		const barrier = createCallBarrier();
		const failingCall = createDeferred();
		const tracked = barrier.track(() => failingCall.promise);
		const waiting = barrier.waitForTrackedCalls();

		failingCall.reject(new Error("the write failed"));

		await expect(tracked).rejects.toThrow("the write failed");
		await expect(waiting).resolves.toBeUndefined();
	});

	it("starts the call before track returns", () => {
		const barrier = createCallBarrier();
		let hasStarted = false;
		void barrier.track(async () => {
			hasStarted = true;
		});

		expect(hasStarted).toBe(true);
	});
});
