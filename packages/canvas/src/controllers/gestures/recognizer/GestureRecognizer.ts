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
 * 進行中のジェスチャー（pointerdown〜pointerup の間）の保持状態。
 * pointerdown で生成し、pointerup / pointercancel / リセットで null に戻す。
 * null = 非ドラッグ中。start 系はジェスチャー開始時点の値を固定保持する。
 */
export type Pressed = {
	pointerId: number;
	start: Point; // 開始位置（SVG / world 座標）
	last: Point; // 直近位置（SVG / world 座標）
	clientStart: Point; // 開始位置（クライアント / 画面座標）
	clientLast: Point; // 直近位置（クライアント / 画面座標）
	time: number;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	mods: Mods;
	dragging: boolean; // DRAG_THRESHOLD を超えてドラッグと確定したか
	button: number;
};

/**
 * 生の DOM イベント（pointer / wheel）を、意味のあるジェスチャー
 * （pressed / dragStart / drag / dragEnd / click / doubleClick / wheel）へ変換し、
 * gestureCallback で 1 件ずつ通知するクラス。
 *
 * ## 処理パイプライン
 *
 *   DOM イベント
 *     → getHandlers() / getWheelHandler() が enqueue()（内部型へ変換しキューへ積む）
 *     → schedule() が「1 フレーム 1 回」の requestAnimationFrame を張る
 *     → RAF コールバックがキューを退避し、各イベントを feed() で処理
 *     → feed() が pressed 状態を進め、対応する Gesture を gestureCallback へ渡す
 *
 * RAF で束ねる狙いは 2 つ。(1) 連続する pointermove を最新 1 件に合体させ、1 フレーム
 * 1 ドラッグに間引く（enqueue の合体ロジック）。(2) 同一フレームに来た down→move→up 等の
 * 順序を保証する（単一キューで時系列を維持）。
 *
 * ## 状態機械（pressed フィールドが中心）
 *
 *   pointerdown             : pressed を生成（dragging=false）。pressed イベントを発火
 *   pointermove（未ドラッグ）: 移動量が DRAG_THRESHOLD を超えたら dragging=true にして dragStart
 *   pointermove（ドラッグ中）: drag を発火（必要に応じてスクロールも適用。後述）
 *   pointerup               : dragging なら dragEnd、そうでなければ click / doubleClick
 *   pointercancel           : ドラッグ中なら dragEnd で締め、pressed を破棄
 *
 * ## 座標系（world と screen の 2 トリプル）
 *
 * 各 Gesture は 2 系統の座標を持つ。
 *   - start / last / delta                   … SVG（world）座標。図形操作のほぼ全ハンドラが使う
 *   - clientStart / clientLast / clientDelta  … クライアント（画面）座標
 * 画面座標が要るのは reducer が DOM を持たない一部の場面だけ。例: 右クリックの
 * コンテキストメニュー位置（clientLast）、グラブスクロールの pan 量（clientDelta）。
 * world 座標はパン中に動くので、viewport 非依存な pan には screen 差分が要る、という住み分け。
 * （clientStart は現状 clientDelta を算出する内部用途のみで、イベントの読み手はいない）
 *
 * ## ドラッグ中スクロール
 *
 * ドラッグ中のホイール（toWheelEvent が pointermove 化）とエッジスクロールは、どちらも
 * drag 経路の scrollDelta として合流する。ビューポートは scrollDelta/zoom だけ動くため、
 * last・delta にも /zoom した量を加算して整合させる（#72）。エッジスクロールは、カーソルが
 * 端で静止していても続くよう、自分のイベントを enqueue() で次フレームへ積み直して自走する。
 */
export class GestureRecognizer {
	private gestureCallback: GestureCallback;
	private containerRef: React.RefObject<HTMLElement | null>;
	private svgRef: React.RefObject<SVGSVGElement | null>;
	private canvasStateRef: React.RefObject<CanvasControllerState>;

	// 進行中ジェスチャーの状態（非ドラッグ中は null）
	private pressed: Pressed | null = null;

	// ダブルクリック判定用。直近の単一クリックの時刻と対象 ID を覚えておく
	private lastClickTime = 0;
	private lastClickTargetId: string | undefined = undefined;

	// RAF バッチ用キュー。
	// 単一キューで時系列順を保持する。連続する pointermove は合体しつつ
	// 末尾位置に残すことで、後続の非 move イベント（up 等）より必ず前に処理される。
	private queue: InternalEvent[] = [];
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
		// 連続する pointermove は最新の 1 件に合体する（キューの肥大化を防ぐ）。
		// ただし末尾が同一ポインターの pointermove のときだけ置き換えることで、
		// 間に非 move イベントを挟んだ場合は順序を崩さない。
		if (e.type === "pointermove") {
			const tail = this.queue[this.queue.length - 1];
			if (tail?.type === "pointermove" && tail.pointerId === e.pointerId) {
				this.queue[this.queue.length - 1] = e;
				this.schedule();
				return;
			}
		}
		this.queue.push(e);
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

			// キューを退避してから feed する。feed 中の enqueue（エッジスクロール等）は
			// 次フレーム分として新しいキューに積まれる。
			const batch = this.queue;
			this.queue = [];
			for (const e of batch) {
				this.feed(e);
			}
		});
	}

	/**
	 * キューから取り出した内部イベントを 1 件処理する。
	 * まずこのイベント時点の座標スナップショット（world / screen）と修飾キーを採り、
	 * 以降はイベント種別ごとに分岐して対応する Gesture を発火する。
	 * 分岐は wheel（ドラッグ外）/ pointerdown / pointermove / pointerup / pointercancel。
	 */
	private feed(e: InternalEvent): void {
		// currentPos は world 座標（getSvgPoint が現在の viewBox を反映して算出）。
		// currentClientPos は画面座標そのもの。
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

		// 開始位置からの移動量（world / screen）。pressed 確定後の各分岐で共有する。
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
					// スライダー等は対象要素から現在値を読む（data-gesture="native-pointer"）
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

						// pointermove は末尾の move と合体されるため、
						// キューは増加せず 1件/フレームの定常ティックになる
						this.enqueue({
							...e,
						});
					}
				}

				// スクロール量を現在位置（=last）と移動量（delta）へ反映する。
				// scrollDelta は生ピクセル。ビューポートは scrollDelta/zoom（SVG単位）だけ
				// 動く（CanvasEventHandler の scroll 処理）ため、カーソルの SVG 座標である
				// currentPos(=last) にも delta と同じく /zoom した量を加算する。
				// 生ピクセルを加算すると zoom≠1 で last が zoom 倍ずれ、last を直接
				// カーソル位置として使う Transform/Vertex/範囲選択がカーソルから乖離する（#72）。
				if (scrollDelta) {
					const svgScrollDeltaX =
						scrollDelta.deltaX / canvasState.viewport.zoom;
					const svgScrollDeltaY =
						scrollDelta.deltaY / canvasState.viewport.zoom;
					currentPos.x += svgScrollDeltaX;
					currentPos.y += svgScrollDeltaY;
					delta.x += svgScrollDeltaX;
					delta.y += svgScrollDeltaY;
				}

				// スライダー等は対象要素から現在値を読む（data-gesture="native-pointer"）
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

			// 終了種別を決める: ドラッグ済みなら dragEnd、未ドラッグなら click / doubleClick。
			let eventType: "dragEnd" | "doubleClick" | "click";
			if (this.pressed.dragging) {
				eventType = "dragEnd";
			} else {
				// ダブルクリック判定: 同一ターゲットへの連続クリックが時間しきい値内か。
				const isDoubleClick =
					this.pressed.targetId === this.lastClickTargetId &&
					time - this.lastClickTime < DOUBLE_CLICK_THRESHOLD;

				eventType = isDoubleClick ? "doubleClick" : "click";

				// 直近クリック情報は single click のときだけ更新する。
				// doubleClick 成立時はリセットし、3 連打目が再び doubleClick になるのを防ぐ。
				if (isDoubleClick) {
					this.lastClickTime = 0;
					this.lastClickTargetId = undefined;
				} else {
					this.lastClickTime = time;
					this.lastClickTargetId = this.pressed.targetId;
				}
			}

			// スライダー等は対象要素から最終値を読む（data-gesture="native-pointer"）
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
				// スライダー等は対象要素から最終値を読む（data-gesture="native-pointer"）
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
		this.queue = [];
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
		this.queue = [];
		this.pressed = null;
	}

	/**
	 * パイプラインの入口。React 要素に貼るポインターイベントハンドラ群を返す。
	 * 各ハンドラは生イベントを内部型へ変換して enqueue するだけで、認識は RAF 後の feed が担う。
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
	 * パイプラインの入口（ホイール用）。コンテナの wheel リスナに繋ぐ。
	 * ドラッグ中は toWheelEvent が pointermove 化するため、スクロールも drag 経路で扱える。
	 */
	public getWheelHandler(): (e: WheelEvent) => void {
		return (e: WheelEvent) => this.enqueue(this.toWheelEvent(e));
	}
}
