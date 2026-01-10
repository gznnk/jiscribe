import type { Point } from "@workspace/geometry";
import type React from "react";
import { useCallback, useRef } from "react";

export type PointerEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
	onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

const DRAG_THRESHOLD = 3 * 3; // 3 pixels squared

type Mods = { shift: boolean; alt: boolean; ctrl: boolean; meta: boolean };

type Pressed = {
	pointerId: number;
	start: Point;
	last: Point;
	time: number;
	target: EventTarget | null;
	mods: Mods;
	dragging: boolean;
};

export const useGestureRecognizer = (): PointerEventHandlers => {
	// Refs for event feeding
	const pressed = useRef<Pressed | null>(null);

	// Refs for RAF queuing
	const fifo = useRef<React.PointerEvent<HTMLElement>[]>([]);
	const lastMove = useRef<React.PointerEvent<HTMLElement> | null>(null);
	const scheduled = useRef<boolean>(false);

	const feed = useCallback((e: React.PointerEvent<HTMLElement>) => {
		// Placeholder for feeding events to the object event processor
		console.log("Processing event:", e.type);

		if (e.type === "pointerdown") {
			pressed.current = {
				pointerId: e.pointerId,
				start: { x: e.clientX, y: e.clientY },
				last: { x: e.clientX, y: e.clientY },
				time: e.timeStamp,
				target: e.target,
				mods: {
					shift: e.shiftKey,
					alt: e.altKey,
					ctrl: e.ctrlKey,
					meta: e.metaKey,
				},
				dragging: false,
			};
			console.log("Pointer down at:", pressed.current.start);
		}

		if (!pressed.current || pressed.current.pointerId !== e.pointerId) {
			return;
		}

		if (e.type === "pointermove") {
			const currentPos = { x: e.clientX, y: e.clientY };
			pressed.current.last = currentPos;

			const deltaX = currentPos.x - pressed.current.start.x;
			const deltaY = currentPos.y - pressed.current.start.y;

			if (!pressed.current.dragging) {
				const distanceSquared = deltaX ** 2 + deltaY ** 2;
				if (distanceSquared >= DRAG_THRESHOLD) {
					pressed.current.dragging = true;
					console.log("Drag started at:", currentPos);
				}
			} else {
				console.log("Dragging. Delta:", { x: deltaX, y: deltaY });
			}
			return;
		}

		if (e.type === "pointerup") {
			pressed.current = null;
			return;
		}

		if (e.type === "pointercancel") {
			pressed.current = null;
			return;
		}
	}, []);

	const schedule = useCallback(() => {
		if (scheduled.current) return;
		scheduled.current = true;
		requestAnimationFrame(() => {
			scheduled.current = false;

			const batch: React.PointerEvent<HTMLElement>[] = [];
			while (fifo.current.length) {
				batch.push(fifo.current.shift()!);
			}
			if (lastMove.current) {
				batch.push(lastMove.current);
				lastMove.current = null;
			}

			if (batch.length) {
				for (const e of batch) {
					feed(e);
				}
			}
		});
	}, [feed]);

	const enqueue = useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			if (e.type === "pointermove") {
				lastMove.current = e;
			} else {
				fifo.current.push(e);
			}
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

	const handlePointerCancel = useCallback<
		React.PointerEventHandler<HTMLElement>
	>((e) => enqueue(e), [enqueue]);

	return {
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: handlePointerUp,
		onPointerCancel: handlePointerCancel,
	};
};
