/** Trailing debounce applied while a coalesce chain is running (< the 1000ms coalesce window). */
const SAVE_DEBOUNCE_MS = 500;

export type SaveRequestScheduler = {
	/**
	 * Called on every save request (saveVersion bump).
	 * A non-coalescing request cancels any pending timer and notifies
	 * immediately (the latest state includes everything a pending save would
	 * have covered). A coalescing request defers notification with a trailing
	 * debounce, firing once the chain has been quiet for the debounce interval.
	 */
	schedule: (isCoalescing: boolean, notify: () => void) => void;
	/** Fires a pending deferred notification immediately (e.g. on unmount). No-op when nothing is pending. */
	flush: () => void;
};

/**
 * Decides when a save request is actually delivered to the host.
 *
 * Key-repeat nudges commit at ~30Hz; notifying (and materializing the Doc) on
 * every repeat is the hot path of issue #125. While the commits are part of a
 * coalesce chain, delivery is debounced; discrete commits keep today's
 * immediate delivery.
 *
 * A continuous chain (a held key) delivers nothing until it stops — accepted
 * trade-off: only an abrupt teardown that skips the unmount flush can lose the
 * chain, and normal unmounts do flush.
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
		}, SAVE_DEBOUNCE_MS);
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
