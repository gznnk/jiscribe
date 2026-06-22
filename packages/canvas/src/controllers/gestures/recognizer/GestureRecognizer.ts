import type { Point } from "@workspace/geometry/src/types/Point";
import type React from "react";

import {
	DOUBLE_CLICK_THRESHOLD,
	DRAG_THRESHOLD,
} from "./GestureRecognizerConstants";
import type {
	GestureCallback,
	GestureRecognizerConfig,
	Mods,
	PointerEventHandlers,
} from "./GestureRecognizerTypes";
import {
	calculateScrollDelta,
	detectEdgeProximity,
	getHoveredElements,
	getInputValue,
	getKindAndId,
	getSvgPoint,
	isGestureOptedOut,
	shouldSkipPointerCapture,
} from "./utils";
import type { CanvasControllerState } from "../../CanvasTypes";

type InternalEventBase = {
	clientX: number;
	clientY: number;
	shiftKey: boolean;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
	target: EventTarget | null;
	timeStamp: number;
	button: number;
};

export type PointerInternalEvent = InternalEventBase & {
	type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
	pointerId: number;
	deltaX?: number;
	deltaY?: number;
};

export type WheelInternalEvent = InternalEventBase & {
	type: "wheel";
	deltaX?: number;
	deltaY?: number;
};

export type InternalEvent = PointerInternalEvent | WheelInternalEvent;

/**
 * pressed状態の型
 */
export type Pressed = {
	pointerId: number;
	start: Point; // SVG coordinates
	last: Point; // SVG coordinates
	clientStart: Point; // Client coordinates
	clientLast: Point; // Client coordinates
	time: number;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	mods: Mods;
	dragging: boolean;
	button: number;
};

/**
 * ジェスチャー認識を行うクラス
 * ポインターイベントを処理し、プレス、ドラッグ、クリックなどのジェスチャーを認識する
 */
export class GestureRecognizer {
	private gestureCallback: GestureCallback;
	private containerRef: React.RefObject<HTMLElement | null>;
	private svgRef: React.RefObject<SVGSVGElement | null>;
	private canvasStateRef: React.RefObject<CanvasControllerState>;

	// State management
	private pressed: Pressed | null = null;

	// Double-click detection
	private lastClickTime = 0;
	private lastClickTargetId: string | undefined = undefined;

	// RAF queuing
	private fifo: InternalEvent[] = [];
	private lastMove: InternalEvent | null = null;
	private scheduled = false;
	private rafId: number | null = null;

	constructor(config: GestureRecognizerConfig) {
		this.gestureCallback = config.gestureCallback;
		this.containerRef = config.containerRef;
		this.svgRef = config.svgRef;
		this.canvasStateRef = config.canvasStateRef;
	}

	/**
	 * イベントをキューに追加してスケジュール
	 */
	private enqueue(e: InternalEvent): void {
		if (e.type === "pointermove") {
			this.lastMove = e;
		} else {
			this.fifo.push(e);
		}
		this.schedule();
	}

	/**
	 * requestAnimationFrameを使ってイベント処理をスケジュール
	 */
	private schedule(): void {
		if (this.scheduled) {
			return;
		}
		this.scheduled = true;
		this.rafId = requestAnimationFrame(() => {
			this.scheduled = false;
			this.rafId = null;

			const batch: InternalEvent[] = [];
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
	 * イベントを処理してジェスチャーコールバックを呼び出す
	 */
	private feed(e: InternalEvent): void {
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
		const inputValue = getInputValue(e.target);

		// wheel: ドラッグ外のホイールイベント
		if (e.type === "wheel") {
			// ドラッグ中はpointermoveとして処理されるため、ここではドラッグ外の処理
			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				targetId,
				this.containerRef.current,
			);

			// ドラッグ外の処理なので、targetIdとtargetKindをcanvasに固定
			// 将来的にオブジェクト上でのホイール操作をサポートする場合はここを変更
			this.gestureCallback({
				type: "wheel",
				target: e.target,
				targetId: "canvas",
				targetKind: "canvas",
				start: currentPos,
				last: currentPos,
				delta: { x: 0, y: 0 },
				clientStart: currentClientPos,
				clientLast: currentClientPos,
				clientDelta: { x: 0, y: 0 },
				mods,
				hovered,
				time,
				button: 0,
				scrollDelta: {
					deltaX: e.deltaX ?? 0,
					deltaY: e.deltaY ?? 0,
				},
				inputValue,
			});
			return;
		}

		// pointerdown: 新しいジェスチャーを開始
		if (e.type === "pointerdown") {
			// 既にアクティブなジェスチャーがある間は、2本目以降の pointerdown を無視する。
			// （マルチタッチ非対応。1本目のドラッグを中断・誤コミットさせないため、
			//  pressed の上書き・ポインターキャプチャ・コールバック発火をすべて行わない）
			if (this.pressed !== null) {
				return;
			}

			// ポインターキャプチャを設定（data-gesture="native-pointer" の要素では設定しない）
			// スライダーなどではブラウザのネイティブなドラッグ挙動を維持する必要がある
			if (this.containerRef.current && !shouldSkipPointerCapture(e.target)) {
				this.containerRef.current.setPointerCapture(e.pointerId);
			}

			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				targetId,
				this.containerRef.current,
			);

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
				inputValue,
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
				this.containerRef.current,
			);

			if (!this.pressed.dragging) {
				// ドラッグ開始判定
				const distanceSquared = delta.x ** 2 + delta.y ** 2;
				if (distanceSquared >= DRAG_THRESHOLD) {
					this.pressed.dragging = true;
					// For sliders, read current value from the target element
					const dragStartInputValue = getInputValue(this.pressed.target);
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
						inputValue: dragStartInputValue,
					});
				}
			} else {
				const canvasState = this.canvasStateRef.current;
				if (!canvasState) {
					return;
				}

				let scrollDelta: { deltaX: number; deltaY: number } | undefined;

				// Check if this pointermove has deltaX/deltaY (converted from wheel event)
				const isWheel = e.deltaX !== undefined || e.deltaY !== undefined;

				// ドラッグ中のホイールイベントの場合はスクロールデルタを取得
				if (isWheel) {
					scrollDelta = {
						deltaX: e.deltaX ?? 0,
						deltaY: e.deltaY ?? 0,
					};
				} else if (canvasState.edgeScrollEnabled) {
					// Detect edge proximity during drag
					const edgeProximity = detectEdgeProximity(
						canvasState.viewport,
						currentPos.x,
						currentPos.y,
					);
					if (edgeProximity.isNearEdge) {
						scrollDelta = calculateScrollDelta(
							edgeProximity.horizontal,
							edgeProximity.vertical,
						);

						// pointermove は lastMove（単一スロット）に上書きされるため、
						// キューは増加せず 1件/フレームの定常ティックになる
						this.enqueue({
							...e,
						});
					}
				}

				// Apply scroll delta to current position and delta
				if (scrollDelta) {
					currentPos.x += scrollDelta.deltaX;
					currentPos.y += scrollDelta.deltaY;
					delta.x += scrollDelta.deltaX / canvasState.viewport.zoom;
					delta.y += scrollDelta.deltaY / canvasState.viewport.zoom;
				}

				// For sliders, read current value from the target element
				const dragInputValue = getInputValue(this.pressed.target);

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
					scrollDelta,
					inputValue: dragInputValue,
				});
			}
			return;
		}

		// pointerup: ジェスチャー終了
		if (e.type === "pointerup") {
			// ポインターキャプチャを解放（data-gesture="native-pointer" の要素では何もしない）
			if (
				this.containerRef.current &&
				!shouldSkipPointerCapture(this.pressed.target)
			) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				this.pressed.targetId,
				this.containerRef.current,
			);

			// Determine event type: dragEnd, doubleClick, or click
			let eventType: "dragEnd" | "doubleClick" | "click";
			if (this.pressed.dragging) {
				eventType = "dragEnd";
			} else {
				// Check for double-click: same target within threshold time
				const isDoubleClick =
					this.pressed.targetId === this.lastClickTargetId &&
					time - this.lastClickTime < DOUBLE_CLICK_THRESHOLD;

				eventType = isDoubleClick ? "doubleClick" : "click";

				// Update last click info for single clicks only
				// (double-click resets to prevent triple-click)
				if (isDoubleClick) {
					this.lastClickTime = 0;
					this.lastClickTargetId = undefined;
				} else {
					this.lastClickTime = time;
					this.lastClickTargetId = this.pressed.targetId;
				}
			}

			// For sliders, read final value from the target element
			const finalInputValue = getInputValue(this.pressed.target);

			this.gestureCallback({
				type: eventType,
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
				inputValue: finalInputValue,
			});
			this.pressed = null;
			return;
		}

		// pointercancel: ジェスチャーを中断
		if (e.type === "pointercancel") {
			// ポインターキャプチャを解放（data-gesture="native-pointer" の要素では何もしない）
			if (
				this.containerRef.current &&
				!shouldSkipPointerCapture(this.pressed.target)
			) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			const hovered = getHoveredElements(
				e.clientX,
				e.clientY,
				this.pressed.targetId,
				this.containerRef.current,
			);

			if (this.pressed.dragging) {
				// For sliders, read final value from the target element
				const cancelInputValue = getInputValue(this.pressed.target);

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
					inputValue: cancelInputValue,
				});
			}
			this.pressed = null;
		}
	}

	/**
	 * React.PointerEventを内部型に変換
	 */
	private toPointerEvent(
		e: React.PointerEvent<HTMLElement>,
	): PointerInternalEvent {
		return {
			type: e.type as PointerInternalEvent["type"],
			pointerId: e.pointerId,
			clientX: e.clientX,
			clientY: e.clientY,
			shiftKey: e.shiftKey,
			altKey: e.altKey,
			ctrlKey: e.ctrlKey,
			metaKey: e.metaKey,
			target: e.target,
			timeStamp: e.timeStamp,
			button: e.button,
		};
	}

	/**
	 * WheelEventを内部型に変換
	 * ドラッグ中の場合は pointermove として変換し、それ以外は wheel として変換
	 */
	private toWheelEvent(e: WheelEvent): InternalEvent {
		// ドラッグ中は pointermove に変換して deltaX/deltaY を保持
		if (this.pressed?.dragging) {
			return {
				type: "pointermove",
				pointerId: this.pressed.pointerId,
				clientX: e.clientX,
				clientY: e.clientY,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				ctrlKey: e.ctrlKey,
				metaKey: e.metaKey,
				target: e.target,
				timeStamp: e.timeStamp,
				button: this.pressed.button,
				deltaX: e.deltaX,
				deltaY: e.deltaY,
			};
		}

		// ドラッグ外は wheel として変換
		return {
			type: "wheel",
			clientX: e.clientX,
			clientY: e.clientY,
			shiftKey: e.shiftKey,
			altKey: e.altKey,
			ctrlKey: e.ctrlKey,
			metaKey: e.metaKey,
			target: e.target,
			timeStamp: e.timeStamp,
			button: 0,
			deltaX: e.deltaX,
			deltaY: e.deltaY,
		};
	}

	/**
	 * ドラッグ状態を外部から強制リセットする。
	 * SYNC_EXTERNAL など外部変更でキャンバス状態が差し替わる際に呼び出す。
	 * pressed が null の場合（非ドラッグ中）は何もしない。
	 */
	public resetGestureState(): void {
		if (this.pressed !== null) {
			if (
				this.containerRef.current &&
				this.pressed.pointerId !== undefined &&
				!shouldSkipPointerCapture(this.pressed.target)
			) {
				this.containerRef.current.releasePointerCapture(this.pressed.pointerId);
			}
			this.pressed = null;
		}
		// 中断後のドラッグイベントが RAF キューから発火しないよう破棄する
		this.fifo = [];
		this.lastMove = null;
	}

	/**
	 * インスタンスを破棄する。
	 * コンポーネントのアンマウント時に呼び出し、保留中の RAF をキャンセルして
	 * アンマウント後にコールバックが発火しないようにする。
	 */
	public dispose(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.scheduled = false;
		this.fifo = [];
		this.lastMove = null;
		this.pressed = null;
	}

	/**
	 * ポインターイベントハンドラーを取得
	 */
	public getHandlers(): PointerEventHandlers {
		return {
			onPointerDown: (e) => {
				// data-gesture="none" の要素由来のイベントはジェスチャーの起点にしない
				// （テキスト編集中の textarea やメニュー内の入力欄など）
				if (isGestureOptedOut(e.target)) {
					return;
				}
				this.enqueue(this.toPointerEvent(e));
			},
			onPointerMove: (e) => this.enqueue(this.toPointerEvent(e)),
			onPointerUp: (e) => this.enqueue(this.toPointerEvent(e)),
			onPointerCancel: (e) => this.enqueue(this.toPointerEvent(e)),
		};
	}

	/**
	 * ホイールイベントハンドラーを取得
	 */
	public getWheelHandler(): (e: WheelEvent) => void {
		return (e: WheelEvent) => this.enqueue(this.toWheelEvent(e));
	}
}
