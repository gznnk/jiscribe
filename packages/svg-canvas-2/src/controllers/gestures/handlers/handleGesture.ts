import { calcFrameKeyPoints, isTransformedFrame } from "@workspace/geometry";
import type { FrameKeyPoints, TransformedFrame } from "@workspace/geometry";

import { gestureHandlerRegistry } from "../../../registry/GestureHandlerRegistry";
import type {
	CanvasEvent,
	EventType,
} from "../../../registry/GestureHandlerRegistryTypes";
import type { CanvasControllerState, EventStartSnapshot } from "../../CanvasTypes";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import type { Gesture } from "../recognizer/GestureRecognizerTypes";
import { calcSnapCandidates } from "./objects/utils/snap/calcSnapCandidates";

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
 * Also manages eventStartSnapshot lifecycle (save on dragStart, clear on dragEnd).
 * Automatically records history when lastCommitTime changes.
 *
 * Note: The gestureHandlerRegistry must be initialized via initializeRegistries()
 * from controllers/setup/ before using this function.
 */
export const handleGesture = (
	state: CanvasControllerState,
	gesture: Gesture,
): CanvasControllerState => {
	let nextState = state;

	// Convert Gesture to CanvasEvent
	// wheel is converted to scroll/zoom, others are passed through
	let canvasEvent: CanvasEvent;
	if (gesture.type === "wheel") {
		if (gesture.mods.ctrl) {
			canvasEvent = { ...gesture, type: "zoom" } as CanvasEvent;
		} else {
			canvasEvent = { ...gesture, type: "scroll" } as CanvasEvent;
		}
	} else {
		canvasEvent = gesture as CanvasEvent;
	}

	// Save eventStartSnapshot on event start
	if (EVENT_START_TYPES.includes(canvasEvent.type)) {
		// 全 Frame オブジェクトの keyPoints を事前計算してキャッシュする
		const keyPointsCache: Record<string, FrameKeyPoints> = {};
		for (const [id, obj] of Object.entries(state.objects)) {
			if (isTransformedFrame(obj)) {
				keyPointsCache[id] = calcFrameKeyPoints(obj as TransformedFrame);
			}
		}

		// multiSelectGroup の keyPoints も同 cache に格納する
		if (state.multiSelectGroup && isTransformedFrame(state.multiSelectGroup)) {
			keyPointsCache[state.multiSelectGroup.id] = calcFrameKeyPoints(
				state.multiSelectGroup as TransformedFrame,
			);
		}

		// スナップ候補を事前計算する（毎 drag event での再計算を避けるため）
		const snapCandidates = calcSnapCandidates(state.objects, keyPointsCache);

		// 選択オブジェクト＋全子孫のIDセットを事前計算する（毎 drag event での再計算を避けるため）
		// dragStart 後に handler が selectedIds を変更した場合は、ObjectEventHandler が上書きする
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			state.selectedIds,
			state.objects,
		);

		const eventStartSnapshot: EventStartSnapshot = {
			objects: state.objects,
			keyPointsCache,
			snapCandidates,
			selectedIds: state.selectedIds,
			selectedIdsWithDescendants,
			multiSelectGroup: state.multiSelectGroup,
			viewport: state.viewport,
		};

		nextState = {
			...state,
			eventStartSnapshot,
		};
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

	// Process all events
	for (const event of derivedEvents) {
		nextState = gestureHandlerRegistry.handle(nextState, event);
	}

	// Clear eventStartSnapshot on event end
	if (EVENT_END_TYPES.includes(canvasEvent.type)) {
		nextState = {
			...nextState,
			eventStartSnapshot: null,
			snapFeedback: null,
			lastCommitTime: canvasEvent.time,
		};
	}

	// Return final state (history recording is handled by canvasReducer)
	return nextState;
};
