import type React from "react";

import { DRAG_THRESHOLD } from "./GestureRecognizerConstants";
import type {
	GestureCallback,
	GestureRecognizerConfig,
	Mods,
	PointerEventHandlers,
	Pressed,
} from "./GestureRecognizerTypes";
import { getHoveredElements, getKindAndId, getSvgPoint } from "./utils";

// 型を再エクスポート
export type {
	Gesture,
	GestureCallback,
	GestureRecognizerConfig,
	GestureType,
	HoveredElement,
	Mods,
	PointerEventHandlers,
} from "./GestureRecognizerTypes";

/**
 * ジェスチャー認識を行うクラス
 * ポインターイベントを処理し、プレス、ドラッグ、クリックなどのジェスチャーを認識する
 */
export class GestureRecognizer {
	private gestureCallback: GestureCallback;
	private containerRef: React.RefObject<HTMLElement | null>;
	private svgRef: React.RefObject<SVGSVGElement | null>;

	// State management
	private pressed: Pressed | null = null;

	// RAF queuing
	private fifo: React.PointerEvent<HTMLElement>[] = [];
	private lastMove: React.PointerEvent<HTMLElement> | null = null;
	private scheduled = false;

	constructor(config: GestureRecognizerConfig) {
		this.gestureCallback = config.gestureCallback;
		this.containerRef = config.containerRef;
		this.svgRef = config.svgRef;
	}

	/**
	 * ポインターイベントを処理してジェスチャーコールバックを呼び出す
	 */
	private feed(e: React.PointerEvent<HTMLElement>): void {
		const currentPos = getSvgPoint(this.svgRef.current, e.clientX, e.clientY);
		const currentClientPos = { x: e.clientX, y: e.clientY };
		const mods: Mods = {
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
			if (this.containerRef.current) {
				this.containerRef.current.setPointerCapture(e.pointerId);
			}

			const hovered = getHoveredElements(e.clientX, e.clientY, targetId);

			// pressed 状態をセット
			this.pressed = {
				pointerId: e.pointerId,
				start: currentPos,
				last: currentPos,
				clientStart: currentClientPos,
				clientLast: currentClientPos,
				time,
				target: e.target,
				targetId,
				targetKind,
				mods,
				dragging: false,
				button: e.button,
			};

			this.gestureCallback({
				type: "pressed",
				target: e.target,
				targetId,
				targetKind,
				start: currentPos,
				last: currentPos,
				delta: { x: 0, y: 0 },
				clientStart: currentClientPos,
				clientLast: currentClientPos,
				clientDelta: { x: 0, y: 0 },
				mods,
				hovered,
				time,
				button: e.button,
			});
			return;
		}

		// 以降の処理は pressed 状態かつ同じポインターの場合のみ
		if (!this.pressed || this.pressed.pointerId !== e.pointerId) {
			return;
		}

		const delta = {
			x: currentPos.x - this.pressed.start.x,
			y: currentPos.y - this.pressed.start.y,
		};
		const clientDelta = {
			x: currentClientPos.x - this.pressed.clientStart.x,
			y: currentClientPos.y - this.pressed.clientStart.y,
		};

		// pointermove: ドラッグ判定と処理
		if (e.type === "pointermove") {
			this.pressed.last = currentPos;
			this.pressed.clientLast = currentClientPos;

			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				this.pressed.targetId,
			);

			if (!this.pressed.dragging) {
				const distanceSquared = delta.x ** 2 + delta.y ** 2;
				if (distanceSquared >= DRAG_THRESHOLD) {
					this.pressed.dragging = true;
					this.gestureCallback({
						type: "dragStart",
						target: this.pressed.target,
						targetId: this.pressed.targetId,
						targetKind: this.pressed.targetKind,
						start: this.pressed.start,
						last: currentPos,
						delta,
						clientStart: this.pressed.clientStart,
						clientLast: currentClientPos,
						clientDelta,
						mods,
						hovered,
						time,
						button: this.pressed.button,
					});
				}
			} else {
				this.gestureCallback({
					type: "drag",
					target: this.pressed.target,
					targetId: this.pressed.targetId,
					targetKind: this.pressed.targetKind,
					start: this.pressed.start,
					last: currentPos,
					delta,
					clientStart: this.pressed.clientStart,
					clientLast: currentClientPos,
					clientDelta,
					mods,
					hovered,
					time,
					button: this.pressed.button,
				});
			}
			return;
		}

		// pointerup: ジェスチャー終了
		if (e.type === "pointerup") {
			// ポインターキャプチャを解放
			if (this.containerRef.current) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				this.pressed.targetId,
			);

			this.gestureCallback({
				type: this.pressed.dragging ? "dragEnd" : "click",
				target: this.pressed.target,
				targetId: this.pressed.targetId,
				targetKind: this.pressed.targetKind,
				start: this.pressed.start,
				last: currentPos,
				delta,
				clientStart: this.pressed.clientStart,
				clientLast: currentClientPos,
				clientDelta,
				mods,
				hovered,
				time,
				button: this.pressed.button,
			});
			this.pressed = null;
			return;
		}

		// pointercancel: ジェスチャーを中断
		if (e.type === "pointercancel") {
			// ポインターキャプチャを解放
			if (this.containerRef.current) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				this.pressed.targetId,
			);

			if (this.pressed.dragging) {
				this.gestureCallback({
					type: "dragEnd",
					target: this.pressed.target,
					targetId: this.pressed.targetId,
					targetKind: this.pressed.targetKind,
					start: this.pressed.start,
					last: currentPos,
					delta,
					clientStart: this.pressed.clientStart,
					clientLast: currentClientPos,
					clientDelta,
					mods,
					hovered,
					time,
					button: this.pressed.button,
				});
			}
			this.pressed = null;
		}
	}

	/**
	 * requestAnimationFrameを使ってイベント処理をスケジュール
	 */
	private schedule(): void {
		if (this.scheduled) return;
		this.scheduled = true;
		requestAnimationFrame(() => {
			this.scheduled = false;

			const batch: React.PointerEvent<HTMLElement>[] = [];
			while (this.fifo.length) {
				batch.push(this.fifo.shift()!);
			}
			if (this.lastMove) {
				batch.push(this.lastMove);
				this.lastMove = null;
			}

			if (batch.length) {
				for (const e of batch) {
					this.feed(e);
				}
			}
		});
	}

	/**
	 * イベントをキューに追加してスケジュール
	 */
	private enqueue(e: React.PointerEvent<HTMLElement>): void {
		if (e.type === "pointermove") {
			this.lastMove = e;
		} else {
			this.fifo.push(e);
		}
		this.schedule();
	}

	/**
	 * ポインターイベントハンドラーを取得
	 */
	public getHandlers(): PointerEventHandlers {
		return {
			onPointerDown: (e) => this.enqueue(e),
			onPointerMove: (e) => this.enqueue(e),
			onPointerUp: (e) => this.enqueue(e),
			onPointerCancel: (e) => this.enqueue(e),
		};
	}
}
