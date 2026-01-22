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
	targetId?: string;
	targetKind?: string;
	mods: Mods;
	dragging: boolean;
};

/**
 * 要素から最も近い [data-kind] を持つ要素の id と kind を取得
 * id が存在しない場合は null を返す
 */
const getKindAndId = (el: Element): { id: string; kind: string } | null => {
	const kindEl = el.closest("[data-kind]");
	if (!kindEl) {
		return null;
	}

	const kind = kindEl.getAttribute("data-kind");
	if (!kind) {
		return null;
	}

	const id = kindEl.getAttribute("data-id");
	if (!id) {
		return null;
	}

	return { id, kind };
};

/**
 * 座標上のホバー要素を取得（重複除外、指定IDの除外）
 */
const getHoveredElements = (
	x: number,
	y: number,
	excludeId?: string,
): HoveredElement[] => {
	const elements = document.elementsFromPoint(x, y);
	const hovered: HoveredElement[] = [];
	const seenIds = new Set<string>();
	for (const el of elements) {
		const item = getKindAndId(el);
		if (!item) {
			continue;
		}

		if (item.kind === "canvas") {
			continue;
		}

		// 重複チェック: 既に同じ id が存在する場合はスキップ
		if (seenIds.has(item.id)) {
			continue;
		}
		seenIds.add(item.id);

		// excludeId と同じ場合は hovered に追加しない
		if (excludeId && item.id === excludeId) {
			continue;
		}
		hovered.push(item);
	}
	return hovered;
};

export type GestureType =
	| "pressed"
	| "dragStart"
	| "drag"
	| "dragEnd"
	| "click";

export type HoveredElement = {
	id: string;
	kind: string;
};

export type Gesture = {
	type: GestureType;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	start: Point;
	last: Point;
	delta: Point;
	mods: Mods;
	hovered: HoveredElement[];
	time: number;
};

export type GestureCallback = (gesture: Gesture) => void;

export type UseGestureRecognizerParams = {
	gestureCallback: GestureCallback;
	targetRef: React.RefObject<HTMLElement | null>;
};

export type PointerEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
	onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

export const useGestureRecognizer = ({
	gestureCallback,
	targetRef,
}: UseGestureRecognizerParams): PointerEventHandlers => {
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
			const target = getKindAndId(e.target as Element);
			const targetId = target?.id;
			const targetKind = target?.kind;
			const time = e.timeStamp;

			// pointerdown: 新しいジェスチャーを開始
			if (e.type === "pointerdown") {
				// ポインターキャプチャを設定
				if (targetRef.current) {
					targetRef.current.setPointerCapture(e.pointerId);
				}

				const hovered = getHoveredElements(e.clientX, e.clientY, targetId);

				// pressed 状態をセット
				pressed.current = {
					pointerId: e.pointerId,
					start: currentPos,
					last: currentPos,
					time,
					target: e.target,
					targetId,
					targetKind,
					mods,
					dragging: false,
				};

				gestureCallback({
					type: "pressed",
					target: e.target,
					targetId,
					targetKind,
					start: currentPos,
					last: currentPos,
					delta: { x: 0, y: 0 },
					mods,
					hovered,
					time,
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

				const hovered = getHoveredElements(
					e.clientX,
					e.clientY,
					pressed.current.targetId,
				);

				if (!pressed.current.dragging) {
					const distanceSquared = delta.x ** 2 + delta.y ** 2;
					if (distanceSquared >= DRAG_THRESHOLD) {
						pressed.current.dragging = true;
						gestureCallback({
							type: "dragStart",
							target: pressed.current.target,
							targetId: pressed.current.targetId,
							targetKind: pressed.current.targetKind,
							start: pressed.current.start,
							last: currentPos,
							delta,
							mods,
							hovered,
							time,
						});
					}
				} else {
					gestureCallback({
						type: "drag",
						target: pressed.current.target,
						targetId: pressed.current.targetId,
						targetKind: pressed.current.targetKind,
						start: pressed.current.start,
						last: currentPos,
						delta,
						mods,
						hovered,
						time,
					});
				}
				return;
			}

			// pointerup: ジェスチャー終了
			if (e.type === "pointerup") {
				// ポインターキャプチャを解放
				if (targetRef.current) {
					targetRef.current.releasePointerCapture(e.pointerId);
				}

				const hovered = getHoveredElements(
					e.clientX,
					e.clientY,
					pressed.current.targetId,
				);

				gestureCallback({
					type: pressed.current.dragging ? "dragEnd" : "click",
					target: pressed.current.target,
					targetId: pressed.current.targetId,
					targetKind: pressed.current.targetKind,
					start: pressed.current.start,
					last: currentPos,
					delta,
					mods,
					hovered,
					time,
				});
				pressed.current = null;
				return;
			}

			// pointercancel: ジェスチャーを中断
			if (e.type === "pointercancel") {
				// ポインターキャプチャを解放
				if (targetRef.current) {
					targetRef.current.releasePointerCapture(e.pointerId);
				}

				const hovered = getHoveredElements(
					e.clientX,
					e.clientY,
					pressed.current.targetId,
				);

				if (pressed.current.dragging) {
					gestureCallback({
						type: "dragEnd",
						target: pressed.current.target,
						targetId: pressed.current.targetId,
						targetKind: pressed.current.targetKind,
						start: pressed.current.start,
						last: currentPos,
						delta,
						mods,
						hovered,
						time,
					});
				}
				pressed.current = null;
			}
		},
		[gestureCallback, targetRef],
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
