import type { Point } from "@workspace/geometry";
import type React from "react";
import { useCallback, useRef } from "react";

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

export type Gesture = {
	type: "pressed" | "dragStart" | "drag" | "dragEnd" | "click";
	target: EventTarget | null;
	start: Point;
	last: Point;
	delta: Point;
	mods: Mods;
};

export type GestureCallback = (gesture: Gesture) => void;

export type PointerEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
	onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

export const useGestureRecognizer = (
	gestureCallback: GestureCallback,
): PointerEventHandlers => {
	// Refs for event feeding
	const pressed = useRef<Pressed | null>(null);

	// Refs for RAF queuing
	const fifo = useRef<React.PointerEvent<HTMLElement>[]>([]);
	const lastMove = useRef<React.PointerEvent<HTMLElement> | null>(null);
	const scheduled = useRef<boolean>(false);

	const feed = useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			const currentPos = { x: e.clientX, y: e.clientY };
			const mods = {
				shift: e.shiftKey,
				alt: e.altKey,
				ctrl: e.ctrlKey,
				meta: e.metaKey,
			};

			// pointerdown: 新しいジェスチャーを開始
			if (e.type === "pointerdown") {
				pressed.current = {
					pointerId: e.pointerId,
					start: currentPos,
					last: currentPos,
					time: e.timeStamp,
					target: e.target,
					mods,
					dragging: false,
				};
				gestureCallback({
					type: "pressed",
					target: e.target,
					start: currentPos,
					last: currentPos,
					delta: { x: 0, y: 0 },
					mods,
				});
				return;
			}

			// 以降の処理は pressed 状態かつ同じポインターの場合のみ
			if (!pressed.current || pressed.current.pointerId !== e.pointerId) {
				return;
			}

			const delta = {
				x: currentPos.x - pressed.current.start.x,
				y: currentPos.y - pressed.current.start.y,
			};

			// pointermove: ドラッグ判定と処理
			if (e.type === "pointermove") {
				pressed.current.last = currentPos;

				if (!pressed.current.dragging) {
					const distanceSquared = delta.x ** 2 + delta.y ** 2;
					if (distanceSquared >= DRAG_THRESHOLD) {
						pressed.current.dragging = true;
						gestureCallback({
							type: "dragStart",
							target: pressed.current.target,
							start: pressed.current.start,
							last: currentPos,
							delta,
							mods,
						});
					}
				} else {
					gestureCallback({
						type: "drag",
						target: pressed.current.target,
						start: pressed.current.start,
						last: currentPos,
						delta,
						mods,
					});
				}
				return;
			}

			// pointerup: ジェスチャー終了
			if (e.type === "pointerup") {
				gestureCallback({
					type: pressed.current.dragging ? "dragEnd" : "click",
					target: pressed.current.target,
					start: pressed.current.start,
					last: currentPos,
					delta,
					mods,
				});
				pressed.current = null;
				return;
			}

			// pointercancel: ジェスチャーを中断
			if (e.type === "pointercancel") {
				if (pressed.current.dragging) {
					gestureCallback({
						type: "dragEnd",
						target: pressed.current.target,
						start: pressed.current.start,
						last: currentPos,
						delta,
						mods,
					});
				}
				pressed.current = null;
			}
		},
		[gestureCallback],
	);

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
