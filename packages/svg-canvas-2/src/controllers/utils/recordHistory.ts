import { canvasToDoc } from "../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Record history if lastCommitTime has changed.
 * This function checks if a commit has occurred and updates the history accordingly.
 *
 * @param state - Current canvas state
 * @param previousLastCommitTime - Previous lastCommitTime to compare against
 * @returns State with updated history if commit occurred, otherwise state with preserved history
 *
 * @example
 * ```typescript
 * const previousTime = state.lastCommitTime;
 * const newState = performSomeOperation(state);
 * return recordHistoryIfNeeded(newState, previousTime);
 * ```
 */
export const recordHistoryIfNeeded = (
	state: CanvasControllerState,
	previousLastCommitTime: number,
): CanvasControllerState => {
	// Check if history should be recorded
	if (
		state.lastCommitTime > 0 &&
		state.lastCommitTime !== previousLastCommitTime
	) {
		const doc = canvasToDoc(state);
		const newPast = [...state.history.past, state.history.present].slice(-50); // Keep max 50 entries

		return {
			...state,
			history: {
				past: newPast,
				present: doc,
				future: [], // Clear future when new action is recorded
			},
		};
	}

	// No commit occurred, preserve existing history
	return state;
};
