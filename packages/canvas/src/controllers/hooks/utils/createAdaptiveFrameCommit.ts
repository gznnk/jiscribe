/**
 * Duration of a synchronous commit above which the wrapped call counts as over
 * budget. Only the JS side is measured (reducer, React render/commit, layout
 * effects); the browser's layout and paint run after the animation frame
 * callback and cannot be measured here, hence the margin below 16.7ms.
 * The budget assumes a 60Hz frame: on a faster display (120Hz, ~8.3ms frames) a
 * commit within budget can still overrun the frame, so the fallback engages
 * later than ideal there.
 */
export const SYNC_COMMIT_BUDGET_MS = 8;

/**
 * Consecutive over-budget calls before commits go back to React's scheduler.
 * A single heavy frame is absorbed: the first frame of a drag builds the start
 * snapshot and must not decide how the rest of the drag commits.
 */
export const OVER_BUDGET_FRAMES_TO_FALL_BACK = 2;

/**
 * While falling back, every this-many-th call is committed synchronously as a
 * probe (about 0.5s at 60Hz). A scheduler-committed call runs its commit in a
 * separate task whose cost cannot be measured, so trying is the only way to
 * learn that the document has become light again.
 */
export const SCHEDULER_PROBE_INTERVAL_FRAMES = 30;

/**
 * A gap with no frame longer than this returns to synchronous commits with the
 * counters reset. The gap is measured between frames, not gestures: a re-grab
 * within it stays in fallback, and a drag held still for longer resets mid-gesture.
 */
export const IDLE_RESET_MS = 250;

export type AdaptiveFrameCommitOptions = {
	/**
	 * Runs `work` and commits the resulting React updates before returning
	 * (`flushSync` in production).
	 */
	commitSynchronously: (work: () => void) => void;
	/** Monotonic clock in milliseconds (`performance.now` in production). */
	now: () => number;
};

/**
 * Creates a `wrapFrameDispatch` (see GestureRecognizerConfig) that commits each
 * frame's gestures synchronously while that stays cheap, and hands them back to
 * React's scheduler once consecutive frames run over budget. Synchronous commits
 * remove a frame of latency; on heavy documents they push the frame past its
 * budget, and the scheduler's pipelining keeps the frame rate instead.
 *
 * The unit of accounting is one wrapper call, not one display frame. While a
 * fling runs and the pointer moves, the recognizer's batch rAF and fling rAF can
 * both fire within one display frame, which is then measured as two calls, each
 * against the budget (biased toward staying synchronous; limited to a fling with
 * hover).
 *
 * Holds its state in a closure; create one per recognizer.
 *
 * @param options - `commitSynchronously` and `now` are the injected effects; the
 *   thresholds are the exported constants of this module.
 * @returns A wrapper that calls the given `dispatchFrame` exactly once per call.
 */
export const createAdaptiveFrameCommit = ({
	commitSynchronously,
	now,
}: AdaptiveFrameCommitOptions): ((dispatchFrame: () => void) => void) => {
	let isCommittingSynchronously = true;
	let overBudgetStreak = 0;
	let framesSinceFallBack = 0;
	let lastFrameEndedAt = Number.NEGATIVE_INFINITY;

	/** Commits the frame synchronously and reports whether it stayed within budget. */
	const commitAndMeasure = (
		dispatchFrame: () => void,
		startedAt: number,
	): boolean => {
		commitSynchronously(dispatchFrame);
		return now() - startedAt <= SYNC_COMMIT_BUDGET_MS;
	};

	return (dispatchFrame) => {
		const startedAt = now();
		if (startedAt - lastFrameEndedAt > IDLE_RESET_MS) {
			isCommittingSynchronously = true;
			overBudgetStreak = 0;
			framesSinceFallBack = 0;
		}

		if (isCommittingSynchronously) {
			if (commitAndMeasure(dispatchFrame, startedAt)) {
				overBudgetStreak = 0;
			} else {
				overBudgetStreak++;
			}
			if (overBudgetStreak >= OVER_BUDGET_FRAMES_TO_FALL_BACK) {
				isCommittingSynchronously = false;
				framesSinceFallBack = 0;
			}
		} else {
			framesSinceFallBack++;
			if (framesSinceFallBack % SCHEDULER_PROBE_INTERVAL_FRAMES === 0) {
				if (commitAndMeasure(dispatchFrame, startedAt)) {
					isCommittingSynchronously = true;
					overBudgetStreak = 0;
				}
			} else {
				dispatchFrame();
			}
		}

		lastFrameEndedAt = now();
	};
};
