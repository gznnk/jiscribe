import type { Point } from "@workspace/geometry";
import type React from "react";

const DRAG_THRESHOLD = 3 * 3; // 3 pixels squared

export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

type Pressed = {
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
	start: Point; // SVG coordinates
	last: Point; // SVG coordinates
	delta: Point; // SVG coordinates
	clientStart: Point; // Client (screen) coordinates
	clientLast: Point; // Client (screen) coordinates
	clientDelta: Point; // Client (screen) coordinates
	mods: Mods;
	hovered: HoveredElement[];
	time: number;
	button: number;
};

export type GestureCallback = (gesture: Gesture) => void;

export type PointerEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
	onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

export type GestureRecognizerConfig = {
	gestureCallback: GestureCallback;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
};

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
	 * Convert client coordinates to SVG coordinates
	 */
	private getSvgPoint(clientX: number, clientY: number): Point {
		const svg = this.svgRef.current;
		if (!svg) {
			// Fallback to client coordinates if SVG ref is not available
			return { x: clientX, y: clientY };
		}

		const point = svg.createSVGPoint();
		point.x = clientX;
		point.y = clientY;

		const ctm = svg.getScreenCTM();
		if (!ctm) {
			// Fallback to client coordinates if CTM is not available
			return { x: clientX, y: clientY };
		}

		const svgPoint = point.matrixTransform(ctm.inverse());
		return { x: svgPoint.x, y: svgPoint.y };
	}

	/**
	 * ポインターイベントを処理してジェスチャーコールバックを呼び出す
	 */
	private feed(e: React.PointerEvent<HTMLElement>): void {
		const currentPos = this.getSvgPoint(e.clientX, e.clientY);
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
