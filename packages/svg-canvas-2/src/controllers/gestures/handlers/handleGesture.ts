import { calcFrameKeyPoints, isTransformedFrame } from "@workspace/geometry";
import type { TransformedFrame } from "@workspace/geometry";

import { gestureHandlerRegistry } from "../../../registry/GestureHandlerRegistry";
import type {
	CanvasEvent,
	EventType,
} from "../../../registry/GestureHandlerRegistryTypes";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { Gesture } from "../recognizer/GestureRecognizerTypes";
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import { calcSnapCandidates } from "./objects/utils/snap/calcSnapCandidates";

/**
 * Event types that should trigger saving the current state as eventStartState.
 * Add new event start types here as needed.
 */
const EVENT_START_TYPES: readonly EventType[] = ["dragStart"] as const;

/**
 * Event types that should trigger clearing the eventStartState.
 * Add new event end types here as needed.
 */
const EVENT_END_TYPES: readonly EventType[] = ["dragEnd"] as const;

/**
 * Main gesture router.
 * Converts low-level gestures to high-level canvas events and routes them to appropriate handlers.
 * Also manages eventStartState lifecycle (save on dragStart, clear on dragEnd).
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

	// Save eventStartState on event start
	if (EVENT_START_TYPES.includes(canvasEvent.type)) {
		// ドラッグ中の再計算を防ぐため、開始時の全オブジェクトに keyPoints を付与してキャッシュする
		const objectsWithKeyPoints = Object.fromEntries(
			Object.entries(state.objects).map(([id, obj]) => {
				// 既存の keyPoints があっても常に最新を計算し直す
				if (isTransformedFrame(obj)) {
					return [
						id,
						{
							...obj,
							keyPoints: calcFrameKeyPoints(obj as TransformedFrame),
						},
					];
				}
				return [id, obj];
			}),
		);

		// スナップ候補を事前計算する（毎 drag event での再計算を避けるため）
		const snapCandidates = calcSnapCandidates(objectsWithKeyPoints);

		// multiSelectGroup があれば keyPoints をキャッシュする（スナップ AABB 計算で利用）
		const multiSelectGroupWithKeyPoints = state.multiSelectGroup
			? {
					...state.multiSelectGroup,
					keyPoints: calcFrameKeyPoints(
						state.multiSelectGroup as TransformedFrame,
					),
				}
			: null;

		// 選択オブジェクト＋全子孫のIDセットを事前計算する（毎 drag event での再計算を避けるため）
		// dragStart 後に handler が selectedIds を変更した場合は、ObjectEventHandler が上書きする
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			state.selectedIds,
			objectsWithKeyPoints,
		);

		nextState = {
			...state,
			eventStartState: {
				...state,
				objects: objectsWithKeyPoints,
				snapCandidates,
				multiSelectGroup: multiSelectGroupWithKeyPoints,
				selectedIdsWithDescendants,
			},
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

	// Clear eventStartState on event end
	if (EVENT_END_TYPES.includes(canvasEvent.type)) {
		// keyPoints をミュータブルに削除（再描画を防ぐため）
		for (const obj of Object.values(nextState.objects)) {
			if ("keyPoints" in obj) {
				delete (obj as Record<string, unknown>).keyPoints;
			}
		}

		nextState = {
			...nextState,
			eventStartState: null,
			snapFeedback: null,
			lastCommitTime: canvasEvent.time,
		};
	}

	// Return final state (history recording is handled by canvasReducer)
	return nextState;
};
