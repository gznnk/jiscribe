import type React from "react";
import { useCallback, useRef } from "react";

export type ObjectEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
};

export const useObjectsEventHandler = (): ObjectEventHandlers => {
	const fifo = useRef<React.PointerEvent<HTMLElement>[]>([]);
	const lastMove = useRef<React.PointerEvent<HTMLElement> | null>(null);
	const scheduled = useRef<boolean>(false);

	const schedule = useCallback(() => {
		if (scheduled.current) return;
		scheduled.current = true;
		requestAnimationFrame(() => {
			scheduled.current = false;

			const batch: React.PointerEvent<HTMLElement>[] = [];
			while (fifo.current.length) batch.push(fifo.current.shift()!);
			if (lastMove.current) {
				batch.push(lastMove.current);
				lastMove.current = null;
			}

			if (batch.length) {
				// onFlush(batch);
				console.log("Flushed events:", batch);
			}
		});
	}, []);

	const enqueue = useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			if (e.type === "pointermove") lastMove.current = e;
			else fifo.current.push(e);
			schedule();
		},
		[schedule],
	);

	const handlePointerDown = useCallback<React.PointerEventHandler<HTMLElement>>(
		(e) => enqueue(e),
		[enqueue],
	);

	const handlePointerMove = useCallback<React.PointerEventHandler<HTMLElement>>(
		(e) => enqueue(e),
		[enqueue],
	);

	const handlePointerUp = useCallback<React.PointerEventHandler<HTMLElement>>(
		(e) => enqueue(e),
		[enqueue],
	);

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
	};
};
