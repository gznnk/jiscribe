/**
 * Backstop for a deferred save whose boundary event never arrives (e.g. a
 * coalescing command dispatched programmatically, with no keyup to follow).
 * Deliberately long: normal key-repeat chains are flushed by the caller on
 * keyup/blur/unmount, so this timer firing mid-chain would only happen on
 * event-less paths. Time is the fallback here, not the boundary — which keeps
 * delivery independent of OS key-repeat delay settings.
 */
const SAVE_BACKSTOP_MS = 2000;

export type SaveRequestScheduler = {
	/**
	 * Called on every save request (saveVersion bump).
	 * A non-coalescing request cancels any pending timer and notifies
	 * immediately (the latest state includes everything a pending save would
	 * have covered). A coalescing request defers notification until flush() —
	 * the caller invokes it on a boundary event (keyup/blur/unmount) — with a
	 * trailing backstop timer for paths that never get one.
	 */
	schedule: (isCoalescing: boolean, notify: () => void) => void;
	/** Fires a pending deferred notification immediately. No-op when nothing is pending. */
	flush: () => void;
};

/**
 * Decides when a save request is actually delivered to the host.
 *
 * Key-repeat nudges commit at ~30Hz; notifying (and materializing the Doc) on
 * every repeat is the hot path of issue #125. While the commits are part of a
 * coalesce chain, delivery waits for flush(); discrete commits keep today's
 * immediate delivery.
 *
 * Extracted from useNotifySaveRequest so the timing rules are testable with
 * fake timers, without rendering the hook.
 */
export const createSaveRequestScheduler = (): SaveRequestScheduler => {
	let timerId: ReturnType<typeof setTimeout> | null = null;
	let pendingNotify: (() => void) | null = null;

	const clearTimer = () => {
		if (timerId !== null) {
			clearTimeout(timerId);
			timerId = null;
		}
	};

	const schedule = (isCoalescing: boolean, notify: () => void) => {
		clearTimer();
		pendingNotify = null;

		if (!isCoalescing) {
			notify();
			return;
		}

		pendingNotify = notify;
		timerId = setTimeout(() => {
			timerId = null;
			const deferredNotify = pendingNotify;
			pendingNotify = null;
			deferredNotify?.();
		}, SAVE_BACKSTOP_MS);
	};

	const flush = () => {
		if (pendingNotify === null) {
			return;
		}
		clearTimer();
		const deferredNotify = pendingNotify;
		pendingNotify = null;
		deferredNotify();
	};

	return { schedule, flush };
};
