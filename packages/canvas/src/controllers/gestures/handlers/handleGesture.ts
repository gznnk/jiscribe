import {
	calcFrameKeyPoints,
	calcPolyKeyPoints,
	isTransformedFrame,
} from "@workspace/geometry";
import type { FrameKeyPoints, TransformedFrame } from "@workspace/geometry";

import { isPoly } from "../../../schemas/objects/types/Poly";
import type {
	CanvasControllerState,
	EventStartSnapshot,
	KeyPointsCache,
} from "../../CanvasTypes";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";
import { buildObjectBBoxes } from "../../utils/buildObjectBBoxes";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { materializeObjects } from "../../utils/cowObjects";
import type { Gesture } from "../recognizer/GestureRecognizerTypes";
import type { CanvasEvent, EventType } from "../registry/GestureHandlerTypes";
import { calcSnapCandidates } from "./utils/snap/calcSnapCandidates";
import { ZOOM } from "../../../constants/zoom";

/**
 * Event types that should trigger saving the current state as eventStartSnapshot.
 * Add new event start types here as needed.
 */
const EVENT_START_TYPES: readonly EventType[] = ["dragStart"] as const;

/**
 * Event types that should trigger clearing the eventStartSnapshot.
 * Add new event end types here as needed.
 */
const EVENT_END_TYPES: readonly EventType[] = ["dragEnd"] as const;

/**
 * Main gesture router.
 * Converts low-level gestures to high-level canvas events and routes them to appropriate handlers.
 * Also manages the eventStartSnapshot and activeDragKind lifecycle (set on dragStart,
 * cleared on dragEnd).
 * Automatically records history when commitVersion changes.
 *
 * Routing uses the canvas's own gesture handler registry, passed in via
 * `registries` (populated when its bundle is built by `createCanvasRegistries`).
 */
export const handleGesture = (
	state: CanvasControllerState,
	gesture: Gesture,
	registries: CanvasRegistries,
): CanvasControllerState => {
	// The end of a glide is a pure state transition — nothing to route, and no
	// handler could tell it apart from a frame that merely moved zero pixels.
	if (gesture.type === "inertialScrollEnd") {
		return state.inertialScrolling
			? { ...state, inertialScrolling: false }
			: state;
	}

	let nextState = state;

	// Convert Gesture to CanvasEvent
	// wheel is converted to scroll/zoom, inertialScroll to scroll, pinch to zoom
	// (+ a derived scroll below), others are passed through
	let canvasEvent: CanvasEvent;
	if (gesture.type === "wheel") {
		if (gesture.mods.ctrl) {
			// One fixed-factor step per wheel event, from the deltaY sign alone
			canvasEvent = {
				...gesture,
				type: "zoom",
				zoomScale:
					(gesture.scrollDelta?.deltaY ?? 0) > 0
						? ZOOM.OUT_FACTOR
						: ZOOM.IN_FACTOR,
				scrollDelta: undefined,
			} as CanvasEvent;
		} else {
			canvasEvent = { ...gesture, type: "scroll" } as CanvasEvent;
		}
	} else if (gesture.type === "inertialScroll") {
		// The glide after a released pan moves the view exactly as a wheel scroll
		// does, with no modifier branch: it comes from no device event, so nothing
		// about it may mean zoom.
		canvasEvent = { ...gesture, type: "scroll" } as CanvasEvent;
	} else if (gesture.type === "pinch") {
		// zoomScale rides on the gesture; last (the finger midpoint) is the anchor
		canvasEvent = {
			...gesture,
			type: "zoom",
			scrollDelta: undefined,
		} as CanvasEvent;
	} else {
		canvasEvent = gesture as CanvasEvent;
	}

	// Save eventStartSnapshot on event start
	if (EVENT_START_TYPES.includes(canvasEvent.type)) {
		// Read state.keyPointsCache and recompute only the objects that changed by reference comparison
		const oldCache = state.keyPointsCache;
		const newCache: KeyPointsCache = {};
		let cacheChanged = false;
		const keyPoints: Record<string, FrameKeyPoints> = {};

		for (const [id, obj] of Object.entries(state.objects)) {
			const cached = oldCache[id];
			if (cached && cached.stateRef === obj) {
				// Cache hit: same reference, so keyPoints are unchanged
				newCache[id] = cached;
				keyPoints[id] = cached.keyPoints;
			} else {
				// Cache miss: recompute
				let computed: FrameKeyPoints | undefined;
				if (isTransformedFrame(obj)) {
					computed = calcFrameKeyPoints(obj as TransformedFrame);
				} else if (isPoly(obj) && obj.type !== "connector") {
					const kp = calcPolyKeyPoints(obj.points);
					if (kp) {
						computed = kp;
					}
				}
				if (computed) {
					newCache[id] = { stateRef: obj, keyPoints: computed };
					keyPoints[id] = computed;
					cacheChanged = true;
				}
				// Objects without a frame (e.g. connectors) are not included in newCache
			}
		}

		// Detect deleted-object entries (newCache is built from state.objects, so they are excluded automatically)
		if (Object.keys(newCache).length !== Object.keys(oldCache).length) {
			cacheChanged = true;
		}

		// keyPoints for multiSelectGroup (recomputed every time since it depends on selection state)
		if (state.multiSelectGroup && isTransformedFrame(state.multiSelectGroup)) {
			keyPoints[state.multiSelectGroup.id] = calcFrameKeyPoints(
				state.multiSelectGroup as TransformedFrame,
			);
		}

		// Recompute snapCandidates only when keyPointsCache changed
		const snapCandidatesCache =
			cacheChanged || !state.snapCandidatesCache
				? calcSnapCandidates(state.objects, keyPoints)
				: state.snapCandidatesCache;

		// Precompute the ID set of selected objects plus all descendants (to avoid recomputing on every drag event)
		// If a handler changes selectedIds after dragStart, ObjectEventHandler overwrites it
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			state.selectedIds,
			state.objects,
		);

		// Flatten keyPoints into per-object root-level bboxes (groups = union of children),
		// so the marquee drag hot path never recomputes bboxes per frame (issue #124).
		const bboxes = buildObjectBBoxes(state.objects, keyPoints);

		const eventStartSnapshot: EventStartSnapshot = {
			objects: state.objects,
			keyPoints,
			bboxes,
			snapCandidates: snapCandidatesCache,
			selectedIds: state.selectedIds,
			selectedIdsWithDescendants,
			multiSelectGroup: state.multiSelectGroup,
			viewport: state.viewport,
		};

		nextState = {
			...state,
			keyPointsCache: newCache,
			snapCandidatesCache,
			eventStartSnapshot,
			// The default every drag starts from. A handler that gives its drag a
			// meaning refines it in its own dragStart; anything else stays "other",
			// which is what keeps "a drag is under way" true for all of them.
			activeDragKind: "other",
		};
	}

	// Raised by every glide frame (idempotent) and lowered by the end gesture
	// above, so it spans the whole glide however many frames it takes.
	if (gesture.type === "inertialScroll" && !nextState.inertialScrolling) {
		nextState = { ...nextState, inertialScrolling: true };
	}

	// Collect events to process (original + derived)
	const derivedEvents: CanvasEvent[] = [canvasEvent];

	// Edge scroll: If drag has scrollDelta, add a scroll event
	if (canvasEvent.type === "drag" && gesture.scrollDelta) {
		derivedEvents.push({
			...canvasEvent,
			type: "scroll",
			targetKind: "canvas",
		});
	}

	// Pinch: the pan component follows the zoom as a scroll event. Order matters —
	// the zoom anchors at the midpoint first, then the pan applies at the new zoom.
	if (gesture.type === "pinch" && gesture.scrollDelta) {
		derivedEvents.push({
			...canvasEvent,
			type: "scroll",
			scrollDelta: gesture.scrollDelta,
		});
	}

	// Process all events
	for (const event of derivedEvents) {
		nextState = registries.gestureHandler.handle(nextState, event, registries);
	}

	// Clear eventStartSnapshot / activeDragKind on event end
	if (EVENT_END_TYPES.includes(canvasEvent.type)) {
		// Only commit if objects/rootIds actually changed.
		// (connectors are also part of rootIds, so comparing rootIds detects them)
		// Guards against phantom undo entries when a drag produces no doc change
		// (e.g. shape drawn below the minimum size threshold).
		const hasDocChanges =
			nextState.objects !== state.objects ||
			nextState.rootIds !== state.rootIds;

		nextState = {
			...nextState,
			// Flatten the per-frame COW view so history / persistence / the next
			// gesture's snapshot only ever hold plain records (#213). No-op when plain.
			objects: materializeObjects(nextState.objects),
			eventStartSnapshot: null,
			activeDragKind: null,
			snapFeedback: null,
			axisLockFeedback: null,
			...(hasDocChanges ? { commitVersion: state.commitVersion + 1 } : {}),
		};
	}

	// Return final state (history recording is handled by canvasReducer)
	return nextState;
};
