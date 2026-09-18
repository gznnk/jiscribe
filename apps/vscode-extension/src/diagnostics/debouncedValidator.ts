/**
 * Per-key debouncing of validation runs, extracted from DiagnosticProvider so
 * the bookkeeping can be unit-tested without VSCode.
 *
 * Change events arrive in bursts: a person typing, an AI agent streaming a
 * rewrite of the file, VSCode reloading a document whose bytes changed on disk.
 * Validating each one parses the whole document for text nobody is done writing
 * yet, so a key waits out its burst first. Each key carries its own timer, so a
 * burst on one document neither delays nor cancels another's run.
 */

/** Timer handle as the ambient `setTimeout` returns it (node's, not the DOM's). */
type TimerHandle = ReturnType<typeof setTimeout>;

/** Schedules, cancels and forces validation runs, one independent timer per key. */
export interface DebouncedValidator {
	/**
	 * Start (or restart) the quiet period for one key.
	 *
	 * @param key - identifies the timer; a second call before the delay elapses
	 *   replaces the pending run rather than adding one
	 */
	schedule(key: string): void;
	/**
	 * Run one key immediately, dropping its pending run if it has one.
	 *
	 * @param key - run happens whether or not anything was scheduled for it, so a
	 *   save validates even when the document was never touched in this session
	 */
	runNow(key: string): void;
	/**
	 * Drop a key's pending run without performing it.
	 *
	 * @param key - a key with nothing pending is left alone rather than reported
	 */
	cancel(key: string): void;
	/** Drop every pending run; the validator stays usable but holds no timers. */
	dispose(): void;
}

/**
 * Build a validator that coalesces repeated requests per key.
 *
 * @param run - performed with the key once its quiet period elapses, on the
 *   timer's own stack; it has to read the current state behind the key, as the
 *   state at schedule time may be several changes old by then
 * @param delayMs - quiet period each key waits after its last `schedule` call;
 *   0 still defers the run to a later turn of the event loop
 * @returns a validator whose timers only stop on `cancel` or `dispose`
 */
export function createDebouncedValidator(
	run: (key: string) => void,
	delayMs: number,
): DebouncedValidator {
	const pendingTimers = new Map<string, TimerHandle>();

	const cancel = (key: string): void => {
		const pendingTimer = pendingTimers.get(key);
		if (pendingTimer !== undefined) {
			clearTimeout(pendingTimer);
			pendingTimers.delete(key);
		}
	};

	return {
		schedule(key: string): void {
			cancel(key);
			pendingTimers.set(
				key,
				setTimeout(() => {
					// Drop the entry before running: the run may schedule the same key
					// again, and that timer must not be cleared as the finished one.
					pendingTimers.delete(key);
					run(key);
				}, delayMs),
			);
		},
		runNow(key: string): void {
			cancel(key);
			run(key);
		},
		cancel,
		dispose(): void {
			for (const pendingTimer of pendingTimers.values()) {
				clearTimeout(pendingTimer);
			}
			pendingTimers.clear();
		},
	};
}
