import { useCallback, useEffect, useRef, useState } from "react";

import { waitForCanvasFrames } from "./canvasFrames";

/** One caller of the wait, released once the render it asked for has committed */
type RenderWaiter = { requestedRenderCount: number; resolve: () => void };

/**
 * A wait for an edit the canvas is still holding to reach onCommit. The canvas takes
 * pointer input up on an animation frame, renders what came of it in a task of
 * React's own, and hands the commit over in an effect of that render. Frames alone
 * cover only the first step: a frame can run ahead of React's queued task, as the
 * first one after a stretch with none drawn does, and a render slower than a frame
 * misses it outright. So past the frames the page renders once more, and the wait
 * ends in that render's effect — React runs a render's pending effects before it
 * starts the next one, so the canvas's commit has been handed over by then.
 *
 * Call it from a component in the canvas's React root: the effects React flushes
 * before a render are the whole root's, so that render has to be in the same one.
 *
 * @returns A stable function whose promise settles once an edit the canvas took in
 *   before the call has reached onCommit, or has turned out to be no edit at all. A
 *   window given no frames goes on after {@link waitForCanvasFrames}'s cap
 */
export function useCanvasCommitWait(): () => Promise<void> {
	const [committedRenderCount, setCommittedRenderCount] = useState(0);
	const requestedRenderCountRef = useRef(0);
	const waitersRef = useRef<RenderWaiter[]>([]);

	useEffect(() => {
		// A waiter that asked after this render began waits for the render it asked for
		const releasedWaiters = waitersRef.current.filter(
			(waiter) => waiter.requestedRenderCount <= committedRenderCount,
		);
		waitersRef.current = waitersRef.current.filter(
			(waiter) => waiter.requestedRenderCount > committedRenderCount,
		);
		for (const waiter of releasedWaiters) {
			waiter.resolve();
		}
	}, [committedRenderCount]);

	return useCallback(async (): Promise<void> => {
		await waitForCanvasFrames();
		await new Promise<void>((resolve) => {
			requestedRenderCountRef.current += 1;
			const requestedRenderCount = requestedRenderCountRef.current;
			waitersRef.current.push({ requestedRenderCount, resolve });
			setCommittedRenderCount(requestedRenderCount);
		});
	}, []);
}
