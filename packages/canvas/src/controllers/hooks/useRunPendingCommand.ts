import { type Dispatch, useEffect } from "react";

import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * Starts the command a press from any entry left pending once its busy
 * indicator has been painted.
 *
 * The command blocks the main thread inside the reducer, so an indicator
 * committed in the same pass would not reach the screen until it ended. A frame
 * callback runs before that frame's paint, so the first one precedes the paint
 * carrying the indicator and the second follows it; the macrotask lets that
 * frame finish before the block starts. Depends on the flag alone, so other
 * dispatches do not restart the wait; a flag cleared meanwhile (an undo, a
 * document swap) or an unmount cancels it. RUN_PENDING_COMMAND carries no id,
 * so a cancelled wait must never dispatch: it would run a later press's command
 * before that one's indicator is painted.
 *
 * @param isPending - `pendingBusyCommandId !== null`; the wait starts when it turns true
 * @param dispatch - Receives RUN_PENDING_COMMAND once, at the end of the wait
 */
export const useRunPendingCommand = (
	isPending: boolean,
	dispatch: Dispatch<CanvasAction>,
): void => {
	useEffect(() => {
		if (!isPending) {
			return;
		}
		let isCancelled = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setTimeout(() => {
					if (!isCancelled) {
						dispatch({ type: "RUN_PENDING_COMMAND" });
					}
				}, 0);
			});
		});
		return () => {
			isCancelled = true;
		};
	}, [isPending, dispatch]);
};
