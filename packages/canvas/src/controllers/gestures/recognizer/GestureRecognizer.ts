import type { Point } from "@workspace/geometry";
import type React from "react";

import { DRAG_THRESHOLD } from "./GestureRecognizerConstants";
import type {
	ClickSnapshot,
	GestureCallback,
	GestureRecognizerConfig,
	GestureType,
	Mods,
	PointerEventHandlers,
	ScrollDelta,
} from "./GestureRecognizerTypes";
import {
	calculateScrollDelta,
	createGetHovered,
	detectEdgeProximity,
	getInputValue,
	getKindAndId,
	getSvgPoint,
	isDoubleClick,
	isGestureOptedOut,
	isNativePointerTarget,
	readInputValue,
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
 * Held state for an in-progress gesture. Created on pointerdown and reset to null on
 * pointerup / pointercancel / reset, so null means no gesture is in progress.
 */
export type Pressed = {
	pointerId: number;
	/** SVG / world coordinates, fixed at gesture start */
	start: Point;
	/** SVG / world coordinates */
	last: Point;
	/** Client / screen coordinates, fixed at gesture start */
	clientStart: Point;
	/** Client / screen coordinates */
	clientLast: Point;
	time: number;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	targetPart?: string;
	mods: Mods;
	/** Whether the move has exceeded DRAG_THRESHOLD and been confirmed as a drag */
	dragging: boolean;
	button: number;
	/**
	 * Whether target is inside a `data-gesture="native-pointer"` element. Fixed at
	 * pointerdown so the per-frame drag path never re-walks closest() (#123); governs both
	 * pointer-capture skipping and inputValue harvesting.
	 */
	isNativePointerTarget: boolean;
	/**
	 * Set once the cursor has left the edge zone during a drag. Grabbing from UI that
	 * touches the edge starts inside the zone, so scrolling must not fire until then.
	 */
	edgeScrollArmed: boolean;
};

/**
 * Converts raw DOM pointer / wheel events into gestures (pressed / dragStart / drag /
 * dragEnd / click / doubleClick / wheel), delivered one at a time via gestureCallback.
 *
 * Events are queued by `enqueue` and drained once per frame by a RAF scheduled in
 * `schedule`, which thins consecutive pointermoves to one drag per frame while a single
 * queue keeps down→move→up arriving in the same frame in chronological order.
 *
 * Each Gesture carries world coordinates (start / last / delta) and screen coordinates
 * (clientStart / clientLast / clientDelta). The screen triple exists for the few readers
 * with no DOM available — the context menu position and the grab-scroll pan amount, which
 * must be viewport-independent because world coordinates shift while panning.
 */
export class GestureRecognizer {
	private gestureCallback: GestureCallback;
	private containerRef: React.RefObject<HTMLElement | null>;
	private svgRef: React.RefObject<SVGSVGElement | null>;
	private canvasStateRef: React.RefObject<CanvasControllerState>;

	private pressed: Pressed | null = null;

	// Baseline for double-click detection; null means no single click has been recorded.
	// The null/undefined distinction matters: targetId is undefined on a background click,
	// so an undefined baseline would make the very first click match itself as a doubleClick.
	private lastClick: ClickSnapshot | null = null;

	private queue: InternalEvent[] = [];
	private scheduled = false;
	private rafId: number | null = null;

	constructor(config: GestureRecognizerConfig) {
		this.gestureCallback = config.gestureCallback;
		this.containerRef = config.containerRef;
		this.svgRef = config.svgRef;
		this.canvasStateRef = config.canvasStateRef;
	}

	/** Add an event to the queue and schedule processing. */
	private enqueue(e: InternalEvent): void {
		// Replacing only a same-pointer pointermove tail keeps ordering intact when a
		// non-move event is interleaved.
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

	/** Schedule event processing using requestAnimationFrame. */
	private schedule(): void {
		if (this.scheduled) {
			return;
		}
		this.scheduled = true;
		this.rafId = requestAnimationFrame(() => {
			this.scheduled = false;
			this.rafId = null;

			// Drain before feeding, so an enqueue during feed (edge scrolling) lands on a
			// fresh queue for the next frame.
			const batch = this.queue;
			this.queue = [];
			for (const e of batch) {
				this.feed(e);
			}
		});
	}

	/**
	 * Process one internal event taken from the queue: snapshot the coordinates and
	 * modifiers at this event's moment, then fire the Gesture its type calls for.
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
		const time = e.timeStamp;

		// Only reached outside a drag; toWheelEvent turns an in-drag wheel into pointermove.
		if (e.type === "wheel") {
			// Needed only as the hover-exclusion key — the gesture's target is fixed to canvas.
			const target = getKindAndId(e.target as Element);
			const getHovered = createGetHovered(
				e.clientX,
				e.clientY,
				target === null ? undefined : { id: target.id, part: target.part },
				this.containerRef.current,
			);

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
				getHovered,
				time,
				button: 0,
				scrollDelta: {
					deltaX: e.deltaX ?? 0,
					deltaY: e.deltaY ?? 0,
				},
				inputValue: getInputValue(e.target),
			});
			return;
		}

		if (e.type === "pointerdown") {
			// Multi-touch is not supported: a second pointerdown must not overwrite pressed,
			// take capture, or fire, or it would interrupt or mis-commit the first drag.
			if (this.pressed !== null) {
				return;
			}

			const target = getKindAndId(e.target as Element);
			const targetId = target?.id;
			const targetKind = target?.kind;
			const targetPart = target?.part;
			const isNativePointer = isNativePointerTarget(e.target);

			// Sliders and the like keep the browser's native drag behavior, so they are
			// left uncaptured.
			if (this.containerRef.current && !isNativePointer) {
				this.containerRef.current.setPointerCapture(e.pointerId);
			}

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
				targetPart,
				mods,
				dragging: false,
				button: e.button,
				edgeScrollArmed: false,
				isNativePointerTarget: isNativePointer,
			};

			this.fireGestureFromPressed(this.pressed, {
				type: "pressed",
				last: currentPos,
				clientLast: currentClientPos,
				delta: { x: 0, y: 0 },
				clientDelta: { x: 0, y: 0 },
				mods,
				time,
			});
			return;
		}

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

		if (e.type === "pointermove") {
			this.pressed.last = currentPos;
			this.pressed.clientLast = currentClientPos;

			if (!this.pressed.dragging) {
				const distanceSquared = delta.x ** 2 + delta.y ** 2;
				if (distanceSquared >= DRAG_THRESHOLD) {
					this.pressed.dragging = true;
					this.fireGestureFromPressed(this.pressed, {
						type: "dragStart",
						last: currentPos,
						clientLast: currentClientPos,
						delta,
						clientDelta,
						mods,
						time,
					});
				}
			} else {
				const canvasState = this.canvasStateRef.current;
				if (!canvasState) {
					return;
				}

				let scrollDelta: { deltaX: number; deltaY: number } | undefined;

				// deltaX/deltaY are present only on a pointermove converted from a wheel.
				const isWheel = e.deltaX !== undefined || e.deltaY !== undefined;

				if (isWheel) {
					scrollDelta = {
						deltaX: e.deltaX ?? 0,
						deltaY: e.deltaY ?? 0,
					};
				} else if (canvasState.edgeScrollEnabled) {
					const edgeProximity = detectEdgeProximity(
						canvasState.viewport,
						currentPos.x,
						currentPos.y,
					);

					if (!edgeProximity.isNearEdge) {
						this.pressed.edgeScrollArmed = true;
					}

					if (this.pressed.edgeScrollArmed && edgeProximity.isNearEdge) {
						scrollDelta = calculateScrollDelta(
							edgeProximity.horizontal,
							edgeProximity.vertical,
						);

						// Keeps scrolling while the cursor is held still at the edge; move
						// coalescing holds this to one tick per frame.
						this.enqueue({
							...e,
						});
					}
				}

				// scrollDelta is raw pixels but the viewport moves by scrollDelta/zoom, so the
				// scaled amount is what last and delta must absorb. Adding raw pixels would
				// drift them by a factor of zoom and pull Transform / Vertex / area-selection
				// away from the cursor (#72).
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

				this.fireGestureFromPressed(this.pressed, {
					type: "drag",
					last: currentPos,
					clientLast: currentClientPos,
					delta,
					clientDelta,
					mods,
					time,
					scrollDelta,
				});
			}
			return;
		}

		if (e.type === "pointerup") {
			if (this.containerRef.current && !this.pressed.isNativePointerTarget) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			let eventType: "dragEnd" | "doubleClick" | "click";
			if (this.pressed.dragging) {
				eventType = "dragEnd";
			} else {
				const currentClick: ClickSnapshot = {
					time,
					clientPos: this.pressed.clientStart,
				};
				const doubleClick = isDoubleClick(this.lastClick, currentClick);

				eventType = doubleClick ? "doubleClick" : "click";

				// Clearing on a doubleClick stops a third rapid click from pairing again.
				this.lastClick = doubleClick ? null : currentClick;
			}

			this.fireGestureFromPressed(this.pressed, {
				type: eventType,
				last: currentPos,
				clientLast: currentClientPos,
				delta,
				clientDelta,
				mods,
				time,
			});
			this.pressed = null;
			return;
		}

		if (e.type === "pointercancel") {
			if (this.containerRef.current && !this.pressed.isNativePointerTarget) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			if (this.pressed.dragging) {
				this.fireGestureFromPressed(this.pressed, {
					type: "dragEnd",
					last: currentPos,
					clientLast: currentClientPos,
					delta,
					clientDelta,
					mods,
					time,
				});
			}
			this.pressed = null;
		}
	}

	/**
	 * Build and fire a Gesture whose identity fields (target / start / button) come from
	 * the pressed state. Shared by every branch after pointerdown, which differ only in
	 * type, coordinate snapshot and scrollDelta; the wheel branch has no pressed state.
	 *
	 * `inputValue` only reads `.value` because the native-pointer qualification was fixed
	 * at pointerdown, keeping closest() off the per-frame drag path (#123).
	 */
	private fireGestureFromPressed(
		pressed: Pressed,
		current: {
			type: Exclude<GestureType, "wheel">;
			last: Point;
			clientLast: Point;
			delta: Point;
			clientDelta: Point;
			mods: Mods;
			time: number;
			scrollDelta?: ScrollDelta;
		},
	): void {
		this.gestureCallback({
			type: current.type,
			target: pressed.target,
			targetId: pressed.targetId,
			targetKind: pressed.targetKind,
			targetPart: pressed.targetPart,
			start: pressed.start,
			last: current.last,
			delta: current.delta,
			clientStart: pressed.clientStart,
			clientLast: current.clientLast,
			clientDelta: current.clientDelta,
			mods: current.mods,
			getHovered: createGetHovered(
				current.clientLast.x,
				current.clientLast.y,
				pressed.targetId === undefined
					? undefined
					: { id: pressed.targetId, part: pressed.targetPart },
				this.containerRef.current,
			),
			time: current.time,
			button: pressed.button,
			scrollDelta: current.scrollDelta,
			inputValue: pressed.isNativePointerTarget
				? readInputValue(pressed.target)
				: undefined,
		});
	}

	/** Convert a React.PointerEvent into the internal type. */
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
	 * Convert a WheelEvent into the internal type: pointermove carrying deltaX/deltaY
	 * during a drag, so scrolling merges into the drag path, and wheel otherwise.
	 */
	private toWheelEvent(e: WheelEvent): InternalEvent {
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
	 * Abort the in-progress gesture: cancel the pending RAF batch, discard queued events,
	 * release pointer capture, and clear pressed. Called on external state swaps
	 * (SYNC_EXTERNAL) and from useGestureRecognizer's effect cleanup (#14).
	 *
	 * NOT terminal — new events re-schedule processing as usual, which is what lets
	 * StrictMode's setup→cleanup→setup resume on the same instance (#78).
	 */
	public cancelPendingGesture(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.scheduled = false;
		this.queue = [];
		if (this.pressed !== null) {
			if (
				this.containerRef.current &&
				this.pressed.pointerId !== undefined &&
				!this.pressed.isNativePointerTarget
			) {
				this.containerRef.current.releasePointerCapture(this.pressed.pointerId);
			}
			this.pressed = null;
		}
	}

	/**
	 * Pointer event handlers to attach to a React element. Each only enqueues; recognition
	 * happens in feed after the RAF.
	 */
	public getHandlers(): PointerEventHandlers {
		return {
			onPointerDown: (e) => {
				// e.g. a textarea during text editing, or an input inside a menu.
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

	/** Wheel listener to wire to the container. */
	public getWheelHandler(): (e: WheelEvent) => void {
		return (e: WheelEvent) => this.enqueue(this.toWheelEvent(e));
	}
}
