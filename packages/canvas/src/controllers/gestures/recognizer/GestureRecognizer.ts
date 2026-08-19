import type { Point } from "@jiscribe/geometry";
import type React from "react";

import {
	DRAG_THRESHOLD,
	DRAG_THRESHOLD_TOUCH,
	FLING_DECAY_PER_FRAME,
	FLING_MAX_FRAME_MS,
	FLING_MIN_SPEED,
	FLING_REFERENCE_FRAME_MS,
	FLING_STOP_SPEED,
	FLING_VELOCITY_WINDOW_MS,
	LONG_PRESS_DURATION_MS,
	PINCH_MIN_DISTANCE,
} from "./GestureRecognizerConstants";
import type {
	ClickSnapshot,
	GestureCallback,
	GestureRecognizerConfig,
	GestureType,
	Mods,
	PointerEventHandlers,
	RecognizerCanvasState,
	ScrollDelta,
} from "./GestureRecognizerTypes";
import {
	calcFlingVelocity,
	calcPinchDist,
	calcPinchMid,
	calculateScrollDelta,
	createGetHovered,
	detectEdgeProximity,
	type FlingSample,
	getGestureTarget,
	getInputValue,
	getSvgPoint,
	isDoubleClick,
	isGestureOptedOut,
	isNativePointerTarget,
	readInputValue,
} from "./utils";

/** Fields every queued event carries, whatever produced it (DOM event, wheel conversion, long-press timer). */
type InternalEventBase = {
	/** Client / screen X in px; feed converts it to world coordinates with getSvgPoint. */
	clientX: number;
	/** Client / screen Y in px, measured from the viewport top — not the canvas origin. */
	clientY: number;
	/** Shift state at this event's moment; each gesture takes mods from the event it fires on, not from pointerdown. */
	shiftKey: boolean;
	/** Alt state at this event's moment. */
	altKey: boolean;
	/** Ctrl state at this event's moment; on wheel it is what routes the gesture to zoom instead of scroll. */
	ctrlKey: boolean;
	/** Meta (Command) state at this event's moment. */
	metaKey: boolean;
	/**
	 * Element the event was dispatched on: resolved into targetId / targetKind and used
	 * as the hover-exclusion key. Nullable per the DOM type; feed casts it to Element.
	 */
	target: EventTarget | null;
	/**
	 * Event time in ms on the performance.now() time base (the synthesized longpress
	 * fills it from performance.now()); becomes the fired gesture's time.
	 */
	timeStamp: number;
	/**
	 * DOM button number, read only from pointerdown (copied to Pressed.button, which every
	 * gesture of that press reports). Ignored on move / up / cancel and on wheel.
	 */
	button: number;
};

/**
 * A queued pointer event: forwarded from React by getHandlers, converted from a wheel
 * event mid-drag by toWheelEvent, or synthesized by the long-press timer.
 */
export type PointerInternalEvent = InternalEventBase & {
	/**
	 * Pointer phase this event carries — the discriminant feed branches on. The four
	 * DOM names arrive from React; "longpress" is synthesized by the long-press timer
	 * instead, filled from the pressed state at fire time.
	 */
	type:
		"pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "longpress";
	/**
	 * Pointer the event belongs to; events of any other pointer are dropped while a press
	 * is held. Synthesized "longpress" and wheel-converted pointermove reuse the pressed id.
	 */
	pointerId: number;
	/**
	 * "mouse" | "pen" | "touch". Absent on pointermove synthesized from a wheel
	 * event (toWheelEvent) — only real touch pointers can enter a pinch.
	 */
	pointerType?: string;
	/** Horizontal wheel delta in screen px; present only on a wheel-converted pointermove, whose in-drag scroll it marks. */
	deltaX?: number;
	/** Vertical wheel delta in screen px, positive scrolling the viewport down; feed folds it into the drag's scrollDelta. */
	deltaY?: number;
};

/** A wheel event queued as itself: reached toWheelEvent outside a confirmed drag. */
export type WheelInternalEvent = InternalEventBase & {
	/** Always "wheel"; the discriminant separating this from PointerInternalEvent. */
	type: "wheel";
	/** Horizontal wheel delta in screen px, taken straight from the DOM event; feed reads it as 0 when absent. */
	deltaX?: number;
	/** Vertical wheel delta in screen px, positive scrolling the viewport down; with ctrl held its sign picks the zoom direction. */
	deltaY?: number;
};

/** One item of the RAF queue, fed to feed in arrival order. */
export type InternalEvent = PointerInternalEvent | WheelInternalEvent;

/**
 * Held state for an in-progress gesture. Created on pointerdown and reset to null on
 * pointerup / pointercancel / longPress / pinch entry / cancelPendingGesture, so null
 * means no gesture is in progress.
 */
export type Pressed = {
	/** Pointer holding the press; events of every other pointer are ignored until it lifts. */
	pointerId: number;
	/**
	 * Pointer type fixed at pointerdown. A pinch may only replace a gesture whose
	 * first pointer is a touch (a mouse press is never converted).
	 */
	pointerType?: string;
	/** SVG / world coordinates, fixed at gesture start */
	start: Point;
	/**
	 * SVG / world coordinates, rewritten on every pointermove (before the drag threshold
	 * is met too). Edge scrolling adds the scrolled amount into it.
	 */
	last: Point;
	/** Client / screen coordinates, fixed at gesture start */
	clientStart: Point;
	/**
	 * Client / screen coordinates, rewritten on every pointermove. Unaffected by edge
	 * scrolling, and the position the synthesized long press fires at.
	 */
	clientLast: Point;
	/** timeStamp of the pointerdown. Gestures carry the time of the event they fire on, not this one. */
	time: number;
	/** Event target of the pointerdown, fixed for the press: it does not follow the cursor during a drag. */
	target: EventTarget | null;
	/** data-id of the pressed [data-kind] element; undefined when getGestureTarget resolved nothing (background press). */
	targetId?: string;
	/** data-kind of the pressed element — the key handlers match on; undefined on a background press. */
	targetKind?: string;
	/** Nearest [data-part] within the pressed element (see getGestureTarget); undefined when it marks none. */
	targetPart?: string;
	/** Modifier snapshot at pointerdown. Fired gestures use the current event's mods; this copy is what the synthesized long press replays. */
	mods: Mods;
	/** Whether the move has exceeded the drag threshold (per pointerType, in screen px) and been confirmed as a drag */
	dragging: boolean;
	/** DOM button number fixed at pointerdown (0 left / 1 middle / 2 right), reported by every gesture of the press including the lift. */
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
 * Held state for an in-progress two-finger pinch (pan + zoom). Entered when a second
 * touch pointerdown arrives before the first touch has confirmed a drag, or during a
 * confirmed drag that shouldPinchFromDrag allows converting (closed with dragEnd first);
 * the pending press is discarded (no click fires — two fingers mean pan/zoom, not a tap).
 * Both pointers' events are consumed here until either lifts; the survivor stays inert
 * until it is lifted and pressed anew.
 */
type Pinch = {
	/**
	 * pointerId -> latest client position of each of the two touches. Exactly two entries,
	 * seeded at pinch entry; a pointermove overwrites only its own pointer's entry.
	 */
	points: Map<number, Point>;
	/** Client midpoint at the last fired pinch gesture; the pan delta is measured against it, then it is overwritten. */
	lastMid: Point;
	/** Client finger distance (px) at the last fired pinch gesture; zoomScale is the current distance over it (1 below PINCH_MIN_DISTANCE). */
	lastDist: number;
};

/**
 * Held state for a glide in progress: the momentum a released pan drag carries
 * until it decays below FLING_STOP_SPEED. Null when nothing is gliding. No
 * pointer is involved — the pointer that started it lifted at fling entry.
 */
type Fling = {
	/** Current velocity in screen px per millisecond, decayed on every frame. */
	velocity: Point;
	/**
	 * Client position the pointer was released at, held fixed for the whole glide.
	 * Only supplies the emitted gesture's coordinates (the pan itself is driven by
	 * scrollDelta), so a stale point is harmless — nothing tracks a cursor here.
	 */
	clientPos: Point;
	/** Time the last frame was integrated up to, on the performance.now() time base. */
	lastTime: number;
};

/** Modifier snapshot for gestures that no key state belongs to (the glide has no live event). */
const NO_MODS: Mods = { shift: false, alt: false, ctrl: false, meta: false };

/**
 * Converts raw DOM pointer / wheel events into gestures (pressed / dragStart / drag /
 * dragEnd / click / doubleClick / wheel / pinch / longPress), delivered one at a time
 * via gestureCallback. Two of them outlive their input: after a flingable pan drag is
 * released, inertialScroll fires frame by frame until the glide decays away, closed by
 * a single inertialScrollEnd (see startFlingIfNeeded / stopFling).
 *
 * Events are queued by `enqueue` and handled once per frame by `processBatch` (a RAF
 * scheduled in `schedule`): every event is fed in chronological order, then per-frame
 * aggregates fire in `settleBatch` (currently the pending pinch). enqueue thins
 * consecutive same-pointer pointermoves to one drag per frame while a single queue
 * keeps down→move→up arriving in the same frame in chronological order.
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
	private canvasStateRef: React.RefObject<RecognizerCanvasState>;
	private shouldPinchFromDrag: GestureRecognizerConfig["shouldPinchFromDrag"];
	private shouldFlingFromDrag: GestureRecognizerConfig["shouldFlingFromDrag"];

	private pressed: Pressed | null = null;

	// Two-finger pinch state (null when not pinching). Mutually exclusive with pressed.
	private pinch: Pinch | null = null;

	// Event context of pinch moves accumulated during the current RAF batch, fired
	// as a single pinch gesture at settleBatch. One gesture per frame is not only
	// thinning: the zoom anchor (the midpoint in world coordinates) is derived from
	// the DOM viewBox, which reflects at most one viewport update per frame — a second
	// gesture in the same batch would anchor against a stale viewBox and drift.
	private pinchPending: {
		mods: Mods;
		time: number;
		target: EventTarget | null;
	} | null = null;

	// Timer armed at a touch pointerdown; when it fires while the press is still
	// within the drag slop, the press becomes a longPress instead of a tap/drag.
	// Cleared wherever the press stops being a candidate (drag confirmed, lift,
	// cancel, pinch entry, external abort).
	private longPressTimer: ReturnType<typeof setTimeout> | null = null;

	// Baseline for double-click detection; null means no single click has been recorded.
	// The null/undefined distinction matters: targetId is undefined on a background click,
	// so an undefined baseline would make the very first click match itself as a doubleClick.
	private lastClick: ClickSnapshot | null = null;

	// Glide left behind by a released pan drag, advanced by its own RAF (independent
	// of the batch scheduler above: it produces gestures rather than consuming events).
	private fling: Fling | null = null;
	private flingRafId: number | null = null;

	// Raw positions of the pressed pointer, trimmed to FLING_VELOCITY_WINDOW_MS and
	// read once at the release to estimate the glide velocity. Recorded in enqueue
	// rather than feed on purpose: feed sees at most one move per frame (enqueue thins
	// the rest), which is too coarse to measure a flick with.
	private flingSamples: FlingSample[] = [];
	// Pointer flingSamples belongs to; samples of any other pointer are ignored.
	private flingSamplePointerId: number | null = null;

	private queue: InternalEvent[] = [];
	private scheduled = false;
	private rafId: number | null = null;

	constructor(config: GestureRecognizerConfig) {
		this.gestureCallback = config.gestureCallback;
		this.containerRef = config.containerRef;
		this.svgRef = config.svgRef;
		this.canvasStateRef = config.canvasStateRef;
		this.shouldPinchFromDrag = config.shouldPinchFromDrag;
		this.shouldFlingFromDrag = config.shouldFlingFromDrag;
	}

	/** Add an event to the queue and schedule processing. */
	private enqueue(e: InternalEvent): void {
		// Fresh input takes the view back from a glide in progress. Checked here, not
		// in feed, so the takeover does not wait for the next frame's batch.
		if (e.type === "pointerdown" || e.type === "wheel") {
			this.stopFling();
		}
		this.recordFlingSample(e);

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

	/** Schedule one processBatch run using requestAnimationFrame. */
	private schedule(): void {
		if (this.scheduled) {
			return;
		}
		this.scheduled = true;
		this.rafId = requestAnimationFrame(() => {
			this.scheduled = false;
			this.rafId = null;
			this.processBatch();
		});
	}

	/**
	 * Process one frame's batch: feed every queued event in chronological order,
	 * then settleBatch.
	 */
	private processBatch(): void {
		// Drain before feeding, so an enqueue during feed (edge scrolling) lands on a
		// fresh queue for the next frame.
		const batch = this.queue;
		this.queue = [];
		for (const e of batch) {
			this.feed(e);
		}
		this.settleBatch();
	}

	/**
	 * Batch-end settlement: per-frame aggregates fire here, once per RAF batch.
	 * Currently that is the pending pinch — both fingers may have moved this batch,
	 * and their combined effect must fire exactly once per frame (see pinchPending).
	 */
	private settleBatch(): void {
		this.firePendingPinch();
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
			const target = getGestureTarget(e.target as Element);
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

		// Long-press timer fired. The clears at every ending path make a stale fire
		// unlikely, but one can still race into the same batch as the ending event —
		// so the press is validated again here.
		if (e.type === "longpress") {
			if (
				this.pressed !== null &&
				this.pressed.pointerId === e.pointerId &&
				!this.pressed.dragging
			) {
				this.fireGestureFromPressed(this.pressed, {
					type: "longPress",
					last: this.pressed.last,
					clientLast: this.pressed.clientLast,
					delta: {
						x: this.pressed.last.x - this.pressed.start.x,
						y: this.pressed.last.y - this.pressed.start.y,
					},
					clientDelta: {
						x: this.pressed.clientLast.x - this.pressed.clientStart.x,
						y: this.pressed.clientLast.y - this.pressed.clientStart.y,
					},
					mods: this.pressed.mods,
					time,
				});
				// The long press consumes the gesture: the lift that follows must not
				// become a click (which would immediately close the opened menu).
				this.releasePointer(e.pointerId);
				this.pressed = null;
			}
			return;
		}

		// Pinch in progress: events of the two participating pointers are consumed here.
		// Events of any other pointer fall through and die at the pressed checks below
		// (pressed is null while pinching), except pointerdown which is caught next.
		if (this.pinch !== null) {
			if (this.pinch.points.has(e.pointerId)) {
				if (e.type === "pointermove") {
					this.pinch.points.set(e.pointerId, currentClientPos);
					this.pinchPending = { mods, time, target: e.target };
					return;
				}
				if (e.type === "pointerup" || e.type === "pointercancel") {
					// A movement in the same batch is still real — apply it before ending
					this.firePendingPinch();
					this.endPinch();
					return;
				}
			}
		}

		if (e.type === "pointerdown") {
			// Third and later fingers do not join or disturb the pinch.
			if (this.pinch !== null) {
				return;
			}

			if (this.pressed !== null) {
				// A second touch switches to a pinch (pan/zoom) when the press has not
				// confirmed a drag yet, or when the injected shouldPinchFromDrag policy
				// allows converting the confirmed drag (the canvas allows its viewport
				// pans — adding a finger mid-pan to zoom is a natural touch motion).
				// Not from a native-pointer press (a slider mid-manipulation keeps its
				// native drag). Otherwise, and for any mouse/pen mix, the extra
				// pointerdown is ignored so it cannot overwrite pressed, take capture,
				// or fire — interrupting or mis-committing the drag (#25).
				const canConvertDrag =
					!this.pressed.dragging ||
					(this.shouldPinchFromDrag?.(this.pressed.targetKind) ?? false);
				if (
					e.pointerType === "touch" &&
					this.pressed.pointerType === "touch" &&
					!this.pressed.isNativePointerTarget &&
					canConvertDrag
				) {
					// Close the pan drag first so the eventStartSnapshot lifecycle
					// completes (dragStart saved it; only dragEnd clears it). A pan
					// changes no doc, so this dragEnd commits nothing.
					if (this.pressed.dragging) {
						this.fireGestureFromPressed(this.pressed, {
							type: "dragEnd",
							last: this.pressed.last,
							clientLast: this.pressed.clientLast,
							delta: {
								x: this.pressed.last.x - this.pressed.start.x,
								y: this.pressed.last.y - this.pressed.start.y,
							},
							clientDelta: {
								x: this.pressed.clientLast.x - this.pressed.clientStart.x,
								y: this.pressed.clientLast.y - this.pressed.clientStart.y,
							},
							mods,
							time,
						});
					}
					this.startPinch(this.pressed, e, currentClientPos);
				}
				return;
			}

			const target = getGestureTarget(e.target as Element);
			const targetId = target?.id;
			const targetKind = target?.kind;
			const targetPart = target?.part;
			const isNativePointer = isNativePointerTarget(e.target);

			// Sliders and the like keep the browser's native drag behavior, so they are
			// left uncaptured.
			if (!isNativePointer) {
				this.capturePointer(e.pointerId);
			}

			this.pressed = {
				pointerId: e.pointerId,
				pointerType: e.pointerType,
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

			// Touch only: mouse users have the right button, and a held mouse press
			// (e.g. hesitating before a drag) must not sprout a menu.
			if (e.pointerType === "touch" && !isNativePointer) {
				this.armLongPress(this.pressed);
			}

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
				// Screen-space distance: a world-based check would scale with zoom.
				// Touch gets a wider slop — finger jitter easily exceeds the mouse value.
				const distanceSquared = clientDelta.x ** 2 + clientDelta.y ** 2;
				const dragThreshold =
					this.pressed.pointerType === "touch"
						? DRAG_THRESHOLD_TOUCH
						: DRAG_THRESHOLD;
				if (distanceSquared >= dragThreshold) {
					this.pressed.dragging = true;
					this.clearLongPress();
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
						// coalescing holds this to one tick per frame. The stamp must be
						// this frame's, not the copied one: every consumer of the tick reads
						// it as the moment it happened. Reusing the original froze the
						// emitted Gesture.time for the whole hold, and left the velocity
						// window unable to advance — so it never trimmed and grew by one
						// sample per frame.
						this.enqueue({
							...e,
							timeStamp: performance.now(),
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
			this.clearLongPress();
			this.releasePointer(e.pointerId);

			let eventType: "dragEnd" | "doubleClick" | "click";
			if (this.pressed.dragging) {
				eventType = "dragEnd";
			} else {
				const currentClick: ClickSnapshot = {
					time,
					clientPos: this.pressed.clientStart,
					button: this.pressed.button,
					pointerType: this.pressed.pointerType,
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
			if (eventType === "dragEnd") {
				this.startFlingIfNeeded(this.pressed, time);
			}
			this.pressed = null;
			return;
		}

		if (e.type === "pointercancel") {
			this.clearLongPress();
			this.releasePointer(e.pointerId);

			if (this.pressed.dragging) {
				// A cancel carries no usable position — Chromium fires it with client
				// (0,0) — so the drag ends where the last move left it. Using the
				// cancel's own coordinates teleported the dragged shape to whatever
				// world point the screen origin mapped to.
				this.fireGestureFromPressed(this.pressed, {
					type: "dragEnd",
					last: this.pressed.last,
					clientLast: this.pressed.clientLast,
					delta: {
						x: this.pressed.last.x - this.pressed.start.x,
						y: this.pressed.last.y - this.pressed.start.y,
					},
					clientDelta: {
						x: this.pressed.clientLast.x - this.pressed.clientStart.x,
						y: this.pressed.clientLast.y - this.pressed.clientStart.y,
					},
					mods,
					time,
				});
			}
			this.pressed = null;
		}
	}

	/**
	 * Take pointer capture on the container, tolerating a pointer that no longer
	 * exists. Processing is deferred to the RAF batch, so a touch may have lifted
	 * before its pointerdown is processed — the pointer is then no longer active and
	 * setPointerCapture throws NotFoundError. Capturing is pointless at that point,
	 * so the error is swallowed. (Mouse pointers are persistent and never hit this.)
	 */
	private capturePointer(pointerId: number): void {
		const container = this.containerRef.current;
		if (container === null) {
			return;
		}
		try {
			container.setPointerCapture(pointerId);
		} catch {
			// The pointer ended before the batch ran — nothing left to capture.
		}
	}

	/**
	 * Release pointer capture, guarded by hasPointerCapture. A lifted touch has
	 * already lost both its activeness and its capture, and a bare
	 * releasePointerCapture would throw NotFoundError (the same deferred-batch race
	 * as capturePointer). The guard also makes the call a natural no-op for pointers
	 * that were never captured (native-pointer targets).
	 */
	private releasePointer(pointerId: number): void {
		const container = this.containerRef.current;
		if (container?.hasPointerCapture(pointerId)) {
			container.releasePointerCapture(pointerId);
		}
	}

	/**
	 * Arm the long-press timer for a fresh touch press. The fire is delivered as a
	 * synthetic "longpress" internal event through the queue, so recognition stays
	 * inside processBatch and keeps its ordering guarantees; the coordinate and
	 * modifier fields are read from the (mutable) pressed state at fire time.
	 */
	private armLongPress(pressed: Pressed): void {
		this.longPressTimer = setTimeout(() => {
			this.longPressTimer = null;
			this.enqueue({
				type: "longpress",
				pointerId: pressed.pointerId,
				pointerType: pressed.pointerType,
				clientX: pressed.clientLast.x,
				clientY: pressed.clientLast.y,
				shiftKey: pressed.mods.shift,
				altKey: pressed.mods.alt,
				ctrlKey: pressed.mods.ctrl,
				metaKey: pressed.mods.meta,
				target: pressed.target,
				timeStamp: performance.now(),
				button: pressed.button,
			});
		}, LONG_PRESS_DURATION_MS);
	}

	/** Disarm the pending long press, if any. */
	private clearLongPress(): void {
		if (this.longPressTimer !== null) {
			clearTimeout(this.longPressTimer);
			this.longPressTimer = null;
		}
	}

	/**
	 * Enter pinch mode from a press plus a second touch: capture the second pointer
	 * (the first was captured at its pointerdown) and discard the press without
	 * firing. For a not-yet-dragging press the tap-or-drag it was waiting to become
	 * never happens; a converting canvas pan drag was already closed with dragEnd by
	 * the caller.
	 */
	private startPinch(
		pressed: Pressed,
		e: PointerInternalEvent,
		currentClientPos: Point,
	): void {
		this.clearLongPress();
		this.capturePointer(e.pointerId);

		const points = new Map([
			[pressed.pointerId, pressed.clientLast],
			[e.pointerId, currentClientPos],
		]);
		this.pinch = {
			points,
			lastMid: calcPinchMid(points),
			lastDist: calcPinchDist(points),
		};
		this.pressed = null;
	}

	/**
	 * Fire the pending pinch gesture for the accumulated finger positions, if any
	 * (see pinchPending): zoomScale is the finger distance ratio since the last fired
	 * pinch event (1 while degenerate, see PINCH_MIN_DISTANCE) and scrollDelta is the
	 * midpoint movement negated (screen px, matching wheel-scroll direction). last
	 * carries the midpoint in world coordinates — the zoom anchor. Like wheel, the
	 * target is fixed to canvas.
	 */
	private firePendingPinch(): void {
		if (this.pinch === null || this.pinchPending === null) {
			return;
		}
		const pinch = this.pinch;
		const { mods, time, target } = this.pinchPending;
		this.pinchPending = null;

		const mid = calcPinchMid(pinch.points);
		const dist = calcPinchDist(pinch.points);
		const zoomScale =
			pinch.lastDist < PINCH_MIN_DISTANCE || dist < PINCH_MIN_DISTANCE
				? 1
				: dist / pinch.lastDist;
		const midWorld = getSvgPoint(this.svgRef.current, mid.x, mid.y);

		this.gestureCallback({
			type: "pinch",
			pointerType: "touch",
			target,
			targetId: "canvas",
			targetKind: "canvas",
			start: midWorld,
			last: midWorld,
			delta: { x: 0, y: 0 },
			clientStart: mid,
			clientLast: mid,
			clientDelta: { x: 0, y: 0 },
			mods,
			getHovered: createGetHovered(
				mid.x,
				mid.y,
				undefined,
				this.containerRef.current,
			),
			time,
			button: 0,
			zoomScale,
			scrollDelta: {
				deltaX: pinch.lastMid.x - mid.x,
				deltaY: pinch.lastMid.y - mid.y,
			},
		});

		pinch.lastMid = mid;
		pinch.lastDist = dist;
	}

	/**
	 * Leave pinch mode, releasing both pointers' captures. The finger that is still
	 * down (if any) stays inert until lifted; no gesture fires.
	 */
	private endPinch(): void {
		if (this.pinch === null) {
			return;
		}
		for (const pointerId of this.pinch.points.keys()) {
			this.releasePointer(pointerId);
		}
		this.pinch = null;
		this.pinchPending = null;
	}

	/**
	 * Record one raw pointer position for the release-velocity estimate. A
	 * pointerdown starts a fresh buffer (each press is measured on its own), and
	 * everything that moves no pointer — wheel-converted moves, the synthesized
	 * long press, other pointers — is skipped.
	 */
	private recordFlingSample(e: InternalEvent): void {
		if (e.type === "pointerdown") {
			this.flingSamplePointerId = e.pointerId;
			this.flingSamples = [
				{ clientX: e.clientX, clientY: e.clientY, time: e.timeStamp },
			];
			return;
		}
		if (
			e.type !== "pointermove" ||
			e.pointerId !== this.flingSamplePointerId ||
			e.deltaX !== undefined ||
			e.deltaY !== undefined
		) {
			return;
		}

		this.flingSamples.push({
			clientX: e.clientX,
			clientY: e.clientY,
			time: e.timeStamp,
		});
		// Trimming here is what puts the estimation window in one place:
		// calcFlingVelocity measures across whatever it is handed.
		while (
			this.flingSamples.length > 1 &&
			e.timeStamp - this.flingSamples[0].time > FLING_VELOCITY_WINDOW_MS
		) {
			this.flingSamples.shift();
		}
	}

	/**
	 * Start a glide from the drag just released, when the injected
	 * shouldFlingFromDrag policy claims it as a pan and the release was fast enough
	 * (FLING_MIN_SPEED). Called after the dragEnd has fired, so the consumer's drag
	 * lifecycle has already closed and the glide is purely additional movement.
	 */
	private startFlingIfNeeded(pressed: Pressed, releaseTime: number): void {
		if (!(this.shouldFlingFromDrag?.(pressed.button) ?? false)) {
			return;
		}

		const velocity = calcFlingVelocity(this.flingSamples, releaseTime);
		if (Math.hypot(velocity.x, velocity.y) < FLING_MIN_SPEED) {
			return;
		}

		this.fling = {
			velocity,
			clientPos: pressed.clientLast,
			lastTime: releaseTime,
		};
		this.scheduleFlingFrame();
	}

	/** Book the next glide frame; advanceFling decides whether one follows it. */
	private scheduleFlingFrame(): void {
		this.flingRafId = requestAnimationFrame((time) => {
			this.flingRafId = null;
			this.advanceFling(time);
		});
	}

	/**
	 * Advance the glide by one frame: fire the distance covered since the previous
	 * one as an inertialScroll gesture, then decay the velocity and either book the
	 * next frame or come to rest.
	 *
	 * @param time - The RAF timestamp, on the same time base as the pointer events
	 *   the glide started from.
	 */
	private advanceFling(time: number): void {
		const fling = this.fling;
		if (fling === null) {
			return;
		}

		// A frame timestamp may predate the pointerup that started the glide (it
		// marks the frame's start, not its callback), hence the lower bound.
		const elapsed = Math.min(
			Math.max(time - fling.lastTime, 0),
			FLING_MAX_FRAME_MS,
		);
		fling.lastTime = time;

		if (elapsed > 0) {
			this.fireGlideGesture("inertialScroll", fling, time, {
				// Negated: the content keeps travelling the way the drag was going,
				// which moves the viewport the opposite way (as a wheel scroll does).
				deltaX: -fling.velocity.x * elapsed,
				deltaY: -fling.velocity.y * elapsed,
			});

			// The callback runs the consumer's reducer synchronously, and that may
			// abort the glide (an external sync calls cancelPendingGesture). Booking
			// another frame past that point would resurrect it.
			if (this.fling !== fling) {
				return;
			}

			const decay =
				FLING_DECAY_PER_FRAME ** (elapsed / FLING_REFERENCE_FRAME_MS);
			fling.velocity = {
				x: fling.velocity.x * decay,
				y: fling.velocity.y * decay,
			};
		}

		if (Math.hypot(fling.velocity.x, fling.velocity.y) < FLING_STOP_SPEED) {
			this.stopFling();
			return;
		}
		this.scheduleFlingFrame();
	}

	/**
	 * Fire one gesture of a glide in progress. The coordinates are the release
	 * position for every frame — the pan is driven by scrollDelta alone, and no
	 * pointer is there to track.
	 *
	 * @param type - Which of the glide's two gestures to fire; only inertialScroll
	 *   carries a scrollDelta.
	 * @param fling - The glide being reported, supplying the client position.
	 * @param time - Value for the gesture's `time`, on the performance.now() base.
	 * @param scrollDelta - Screen-px distance covered since the previous frame;
	 *   omitted for the end gesture, which moves nothing.
	 */
	private fireGlideGesture(
		type: "inertialScroll" | "inertialScrollEnd",
		fling: Fling,
		time: number,
		scrollDelta?: ScrollDelta,
	): void {
		const clientPos = fling.clientPos;
		const worldPos = getSvgPoint(this.svgRef.current, clientPos.x, clientPos.y);
		this.gestureCallback({
			type,
			target: null,
			targetId: "canvas",
			targetKind: "canvas",
			start: worldPos,
			last: worldPos,
			delta: { x: 0, y: 0 },
			clientStart: clientPos,
			clientLast: clientPos,
			clientDelta: { x: 0, y: 0 },
			mods: NO_MODS,
			getHovered: () => [],
			time,
			button: 0,
			scrollDelta,
		});
	}

	/**
	 * Bring any glide to an immediate stop, cancelling its pending frame and
	 * announcing the end. Every way a glide can end routes through here — decayed
	 * away, interrupted by fresh input, aborted — so inertialScrollEnd fires
	 * exactly once per glide.
	 */
	private stopFling(): void {
		if (this.flingRafId !== null) {
			cancelAnimationFrame(this.flingRafId);
			this.flingRafId = null;
		}
		const fling = this.fling;
		if (fling === null) {
			return;
		}
		this.fling = null;
		this.fireGlideGesture("inertialScrollEnd", fling, performance.now());
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
			type: Exclude<GestureType, "wheel" | "pinch" | "inertialScroll">;
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
			pointerType: pressed.pointerType,
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
			pointerType: e.pointerType,
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
	 * release pointer capture, clear pressed / pinch, and stop any glide. Called on
	 * external state swaps (SYNC_EXTERNAL) and from useGestureRecognizer's effect
	 * cleanup (#14).
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
		this.clearLongPress();
		this.stopFling();
		if (this.pressed !== null) {
			this.releasePointer(this.pressed.pointerId);
			this.pressed = null;
		}
		this.endPinch();
	}

	/**
	 * Pointer event handlers to attach to a React element. Each only enqueues; recognition
	 * happens in feed after the RAF.
	 */
	public getHandlers(): PointerEventHandlers {
		return {
			onPointerDown: (e) => {
				// e.g. the editing surface during text editing, or an input inside a menu.
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
