import type { Point } from "@workspace/geometry";
import type React from "react";

import { DRAG_THRESHOLD } from "./GestureRecognizerConstants";
import type {
	ClickSnapshot,
	GestureCallback,
	GestureRecognizerConfig,
	Mods,
	PointerEventHandlers,
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
 * Held state for an in-progress gesture (between pointerdown and pointerup).
 * Created on pointerdown and reset to null on pointerup / pointercancel / reset.
 * null = not dragging. The `start` fields retain the values fixed at gesture start.
 */
export type Pressed = {
	pointerId: number;
	start: Point; // start position (SVG / world coordinates)
	last: Point; // most recent position (SVG / world coordinates)
	clientStart: Point; // start position (client / screen coordinates)
	clientLast: Point; // most recent position (client / screen coordinates)
	time: number;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	targetPart?: string;
	mods: Mods;
	dragging: boolean; // whether the move has exceeded DRAG_THRESHOLD and been confirmed as a drag
	button: number;
	// Whether target is inside a data-gesture="native-pointer" element (slider etc.).
	// Fixed at pointerdown and immutable for the gesture's lifetime, so the per-frame
	// drag path reads this instead of re-walking closest() (#123). Governs both
	// pointer-capture skipping and inputValue harvesting.
	isNativePointerTarget: boolean;
	// Whether edge scrolling has been armed. Becomes true once the cursor has
	// left the edge zone during a drag. When grabbing from a UI touching the
	// edge (e.g. StencilLibrary), the start point is always inside the edge zone,
	// so this prevents scrolling from firing spuriously on the first frame.
	edgeScrollArmed: boolean;
};

/**
 * Converts raw DOM events (pointer / wheel) into meaningful gestures
 * (pressed / dragStart / drag / dragEnd / click / doubleClick / wheel)
 * and notifies them one at a time via gestureCallback.
 *
 * ## Processing pipeline
 *
 *   DOM event
 *     → getHandlers() / getWheelHandler() call enqueue() (convert to internal type and push onto the queue)
 *     → schedule() sets up a "once per frame" requestAnimationFrame
 *     → the RAF callback drains the queue and processes each event via feed()
 *     → feed() advances the pressed state and passes the corresponding Gesture to gestureCallback
 *
 * Batching via RAF has two goals. (1) Coalesce consecutive pointermove events into
 * the latest one, thinning to one drag per frame (the coalescing logic in enqueue).
 * (2) Guarantee the ordering of down→move→up etc. arriving in the same frame
 * (a single queue preserves chronological order).
 *
 * ## State machine (centered on the pressed field)
 *
 *   pointerdown            : create pressed (dragging=false). Fire the pressed event.
 *   pointermove (not dragging): if the move exceeds DRAG_THRESHOLD, set dragging=true and fire dragStart
 *   pointermove (dragging) : fire drag (also applying scroll when needed; see below)
 *   pointerup              : dragEnd if dragging, otherwise click / doubleClick
 *   pointercancel          : if dragging, close out with dragEnd, then discard pressed
 *
 * ## Coordinate systems (two triples: world and screen)
 *
 * Each Gesture carries two sets of coordinates.
 *   - start / last / delta                   … SVG (world) coordinates. Used by nearly all shape-operation handlers.
 *   - clientStart / clientLast / clientDelta  … client (screen) coordinates
 * Screen coordinates are only needed in a few places where the reducer has no DOM.
 * Examples: the right-click context menu position (clientLast) and the pan amount
 * for grab scrolling (clientDelta). Since world coordinates shift during panning,
 * viewport-independent panning needs the screen delta — hence the split.
 * (clientStart is currently only used internally to compute clientDelta; no event reader consumes it.)
 *
 * ## Scrolling during a drag
 *
 * Wheel events during a drag (turned into pointermove by toWheelEvent) and edge
 * scrolling both merge into the drag path as scrollDelta. Since the viewport moves
 * only by scrollDelta/zoom, the /zoom-scaled amount is also added to last and delta
 * to keep them consistent (#72). Edge scrolling re-enqueues its own event for the
 * next frame via enqueue() so it keeps running even when the cursor is held still at the edge.
 */
export class GestureRecognizer {
	private gestureCallback: GestureCallback;
	private containerRef: React.RefObject<HTMLElement | null>;
	private svgRef: React.RefObject<SVGSVGElement | null>;
	private canvasStateRef: React.RefObject<CanvasControllerState>;

	// State of the in-progress gesture (null when not dragging)
	private pressed: Pressed | null = null;

	// Used for double-click detection. Remembers a snapshot of the most recent single click.
	// null = no single click has been recorded yet (no baseline for doubleClick).
	// Since targetId can be undefined on a background click, representing "not recorded"
	// with undefined would make the first click turn into a doubleClick via
	// undefined===undefined. Distinguishing null from undefined ensures we never
	// treat a click as a doubleClick when there is no baseline (isDoubleClick).
	private lastClick: ClickSnapshot | null = null;

	// Queue for RAF batching.
	// A single queue preserves chronological order. Consecutive pointermove events are
	// coalesced while kept at the tail position, so they are always processed before any
	// following non-move event (e.g. up).
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
	 * Add an event to the queue and schedule processing.
	 */
	private enqueue(e: InternalEvent): void {
		// Coalesce consecutive pointermove events into the latest one (to prevent the queue from bloating).
		// Only replace when the tail is a pointermove for the same pointer, so ordering
		// is preserved when a non-move event is interleaved.
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
	 * Schedule event processing using requestAnimationFrame.
	 */
	private schedule(): void {
		if (this.scheduled) {
			return;
		}
		this.scheduled = true;
		this.rafId = requestAnimationFrame(() => {
			this.scheduled = false;
			this.rafId = null;

			// Drain the queue before feeding. Any enqueue during feed (e.g. edge
			// scrolling) is pushed onto a fresh queue for the next frame.
			const batch = this.queue;
			this.queue = [];
			for (const e of batch) {
				this.feed(e);
			}
		});
	}

	/**
	 * Process one internal event taken from the queue.
	 * First captures a coordinate snapshot (world / screen) and the modifier keys at
	 * this event's moment, then branches by event type to fire the corresponding Gesture.
	 * Branches: wheel (outside a drag) / pointerdown / pointermove / pointerup / pointercancel.
	 */
	private feed(e: InternalEvent): void {
		// currentPos is world coordinates (getSvgPoint computes them reflecting the current viewBox).
		// currentClientPos is the screen coordinates as-is.
		const currentPos = getSvgPoint(this.svgRef.current, e.clientX, e.clientY);
		const currentClientPos = { x: e.clientX, y: e.clientY };
		const mods: Mods = {
			shift: e.shiftKey,
			alt: e.altKey,
			ctrl: e.ctrlKey,
			meta: e.metaKey,
		};
		const time = e.timeStamp;

		// wheel: wheel event outside a drag
		if (e.type === "wheel") {
			// The origin element only matters as the hover-exclusion key here
			// (targetId/targetKind on the gesture are fixed to canvas below)
			const target = getKindAndId(e.target as Element);
			// During a drag it is handled as pointermove, so this only handles the non-drag case
			const getHovered = createGetHovered(
				e.clientX,
				e.clientY,
				target === null ? undefined : { id: target.id, part: target.part },
				this.containerRef.current,
			);

			// Since this is the non-drag case, fix targetId and targetKind to canvas.
			// Change here if wheel operations over objects are supported in the future.
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

		// pointerdown: start a new gesture
		if (e.type === "pointerdown") {
			// While a gesture is already active, ignore any second-or-later pointerdown.
			// (Multi-touch is not supported. To avoid interrupting or mis-committing the
			//  first drag, we skip overwriting pressed, setting pointer capture, and firing callbacks.)
			if (this.pressed !== null) {
				return;
			}

			const target = getKindAndId(e.target as Element);
			const targetId = target?.id;
			const targetKind = target?.kind;
			const targetPart = target?.part;
			const isNativePointer = isNativePointerTarget(e.target);

			// Set pointer capture (not set on data-gesture="native-pointer" elements).
			// Sliders and the like need to keep the browser's native drag behavior.
			if (this.containerRef.current && !isNativePointer) {
				this.containerRef.current.setPointerCapture(e.pointerId);
			}

			const getHovered = createGetHovered(
				e.clientX,
				e.clientY,
				targetId === undefined ? undefined : { id: targetId, part: targetPart },
				this.containerRef.current,
			);

			// Set the pressed state
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

			this.gestureCallback({
				type: "pressed",
				target: e.target,
				targetId,
				targetKind,
				targetPart,
				start: currentPos,
				last: currentPos,
				delta: { x: 0, y: 0 },
				clientStart: currentClientPos,
				clientLast: currentClientPos,
				clientDelta: { x: 0, y: 0 },
				mods,
				getHovered,
				time,
				button: e.button,
				inputValue: isNativePointer ? readInputValue(e.target) : undefined,
			});
			return;
		}

		// The remaining processing only applies when pressed and for the same pointer
		if (!this.pressed || this.pressed.pointerId !== e.pointerId) {
			return;
		}

		// Movement from the start position (world / screen). Shared across the branches after pressed is confirmed.
		const delta = {
			x: currentPos.x - this.pressed.start.x,
			y: currentPos.y - this.pressed.start.y,
		};
		const clientDelta = {
			x: currentClientPos.x - this.pressed.clientStart.x,
			y: currentClientPos.y - this.pressed.clientStart.y,
		};

		// pointermove: drag detection and handling
		if (e.type === "pointermove") {
			this.pressed.last = currentPos;
			this.pressed.clientLast = currentClientPos;

			const getHovered = createGetHovered(
				e.clientX,
				e.clientY,
				this.pressed.targetId === undefined
					? undefined
					: { id: this.pressed.targetId, part: this.pressed.targetPart },
				this.containerRef.current,
			);

			if (!this.pressed.dragging) {
				// Drag-start detection
				const distanceSquared = delta.x ** 2 + delta.y ** 2;
				if (distanceSquared >= DRAG_THRESHOLD) {
					this.pressed.dragging = true;
					this.gestureCallback({
						type: "dragStart",
						target: this.pressed.target,
						targetId: this.pressed.targetId,
						targetKind: this.pressed.targetKind,
						targetPart: this.pressed.targetPart,
						start: this.pressed.start,
						last: currentPos,
						delta,
						clientStart: this.pressed.clientStart,
						clientLast: currentClientPos,
						clientDelta,
						mods,
						getHovered,
						time,
						button: this.pressed.button,
						inputValue: this.readPressedInputValue(),
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

				// For a wheel event during a drag, obtain the scroll delta
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

					// Arm once the cursor has left the edge zone at least once. This prevents
					// spurious firing right after grabbing from a library etc. touching the
					// edge (while still inside the edge zone).
					if (!edgeProximity.isNearEdge) {
						this.pressed.edgeScrollArmed = true;
					}

					if (this.pressed.edgeScrollArmed && edgeProximity.isNearEdge) {
						scrollDelta = calculateScrollDelta(
							edgeProximity.horizontal,
							edgeProximity.vertical,
						);

						// Since pointermove is coalesced with the tail move,
						// the queue does not grow and becomes a steady tick of 1 per frame
						this.enqueue({
							...e,
						});
					}
				}

				// Reflect the scroll amount into the current position (=last) and the movement (delta).
				// scrollDelta is in raw pixels. The viewport moves only by scrollDelta/zoom
				// (SVG units) (the scroll handling in CanvasEventHandler), so the /zoom-scaled
				// amount is also added to currentPos(=last), the cursor's SVG coordinate, just like delta.
				// Adding raw pixels would offset last by a factor of zoom when zoom≠1, causing
				// Transform/Vertex/area-selection — which use last directly as the cursor position —
				// to diverge from the cursor (#72).
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

				this.gestureCallback({
					type: "drag",
					target: this.pressed.target,
					targetId: this.pressed.targetId,
					targetKind: this.pressed.targetKind,
					targetPart: this.pressed.targetPart,
					start: this.pressed.start,
					last: currentPos,
					delta,
					clientStart: this.pressed.clientStart,
					clientLast: currentClientPos,
					clientDelta,
					mods,
					getHovered,
					time,
					button: this.pressed.button,
					scrollDelta,
					inputValue: this.readPressedInputValue(),
				});
			}
			return;
		}

		// pointerup: gesture end
		if (e.type === "pointerup") {
			// Release pointer capture (does nothing on data-gesture="native-pointer" elements)
			if (this.containerRef.current && !this.pressed.isNativePointerTarget) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			const getHovered = createGetHovered(
				e.clientX,
				e.clientY,
				this.pressed.targetId === undefined
					? undefined
					: { id: this.pressed.targetId, part: this.pressed.targetPart },
				this.containerRef.current,
			);

			// Decide the end type: dragEnd if dragged, otherwise click / doubleClick.
			let eventType: "dragEnd" | "doubleClick" | "click";
			if (this.pressed.dragging) {
				eventType = "dragEnd";
			} else {
				const currentClick: ClickSnapshot = {
					time,
					targetId: this.pressed.targetId,
					targetPart: this.pressed.targetPart,
					clientPos: this.pressed.clientStart,
				};
				const doubleClick = isDoubleClick(this.lastClick, currentClick);

				eventType = doubleClick ? "doubleClick" : "click";

				// Update the last-click info only on a single click.
				// Reset to null when a doubleClick occurs, to prevent a third rapid click from becoming another doubleClick.
				this.lastClick = doubleClick ? null : currentClick;
			}

			this.gestureCallback({
				type: eventType,
				target: this.pressed.target,
				targetId: this.pressed.targetId,
				targetKind: this.pressed.targetKind,
				targetPart: this.pressed.targetPart,
				start: this.pressed.start,
				last: currentPos,
				delta,
				clientStart: this.pressed.clientStart,
				clientLast: currentClientPos,
				clientDelta,
				mods,
				getHovered,
				time,
				button: this.pressed.button,
				inputValue: this.readPressedInputValue(),
			});
			this.pressed = null;
			return;
		}

		// pointercancel: abort the gesture
		if (e.type === "pointercancel") {
			// Release pointer capture (does nothing on data-gesture="native-pointer" elements)
			if (this.containerRef.current && !this.pressed.isNativePointerTarget) {
				this.containerRef.current.releasePointerCapture(e.pointerId);
			}

			if (this.pressed.dragging) {
				const getHovered = createGetHovered(
					e.clientX,
					e.clientY,
					this.pressed.targetId === undefined
						? undefined
						: { id: this.pressed.targetId, part: this.pressed.targetPart },
					this.containerRef.current,
				);

				this.gestureCallback({
					type: "dragEnd",
					target: this.pressed.target,
					targetId: this.pressed.targetId,
					targetKind: this.pressed.targetKind,
					targetPart: this.pressed.targetPart,
					start: this.pressed.start,
					last: currentPos,
					delta,
					clientStart: this.pressed.clientStart,
					clientLast: currentClientPos,
					clientDelta,
					mods,
					getHovered,
					time,
					button: this.pressed.button,
					inputValue: this.readPressedInputValue(),
				});
			}
			this.pressed = null;
		}
	}

	/**
	 * Read the current inputValue from the pressed target.
	 * The native-pointer qualification is fixed at pointerdown
	 * (Pressed.isNativePointerTarget), so this only reads .value — no closest() walk
	 * on the per-frame drag path (#123). Sliders and the like propagate their value
	 * via gesture events (data-gesture="native-pointer").
	 */
	private readPressedInputValue(): string | undefined {
		return this.pressed?.isNativePointerTarget
			? readInputValue(this.pressed.target)
			: undefined;
	}

	/**
	 * Convert a React.PointerEvent into the internal type.
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
	 * Convert a WheelEvent into the internal type.
	 * During a drag it is converted to pointermove; otherwise it is converted to wheel.
	 */
	private toWheelEvent(e: WheelEvent): InternalEvent {
		// During a drag, convert to pointermove and retain deltaX/deltaY
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

		// Outside a drag, convert to wheel
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
	 * Abort the in-progress gesture: cancel the pending RAF batch, discard queued
	 * events, release pointer capture, and clear pressed.
	 *
	 * The single lifecycle operation shared by both callers:
	 *   - external state swaps (SYNC_EXTERNAL via useSyncExternalDoc), so a held
	 *     drag does not keep firing against the replaced state
	 *   - useGestureRecognizer's effect cleanup, so the RAF callback does not fire
	 *     after unmount (#14)
	 *
	 * NOT terminal: the instance stays fully functional afterwards — new events
	 * re-schedule processing as usual. StrictMode's effect setup→cleanup→setup
	 * relies on this to resume with the same instance (#78). Destruction is left
	 * to GC; after a real unmount no events arrive because the handlers are
	 * detached with the DOM.
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
	 * The pipeline entry point. Returns the pointer event handlers to attach to a React element.
	 * Each handler only converts the raw event to the internal type and enqueues it; recognition is done by feed after RAF.
	 */
	public getHandlers(): PointerEventHandlers {
		return {
			onPointerDown: (e) => {
				// Events originating from data-gesture="none" elements do not start a gesture
				// (e.g. a textarea during text editing or an input field inside a menu)
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
	 * The pipeline entry point (for wheel). Wire this to the container's wheel listener.
	 * During a drag, toWheelEvent turns it into pointermove, so scrolling can also be handled via the drag path.
	 */
	public getWheelHandler(): (e: WheelEvent) => void {
		return (e: WheelEvent) => this.enqueue(this.toWheelEvent(e));
	}
}
