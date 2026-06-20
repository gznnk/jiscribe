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
import { buildSelectedIdsWithDescendants } from "../../utils/buildSelectedIdsWithDescendants";
import type { Gesture } from "../recognizer/GestureRecognizerTypes";
import { gestureHandlerRegistry } from "../registry/GestureHandlerRegistry";
import type { CanvasEvent, EventType } from "../registry/GestureHandlerTypes";
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
 * Automatically records history when commitVersion changes.
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
			canvasEvent = {
				...gesture,
				type: "zoom",
				zoomDelta: gesture.scrollDelta?.deltaY,
				scrollDelta: undefined,
			} as CanvasEvent;
		} else {
			canvasEvent = { ...gesture, type: "scroll" } as CanvasEvent;
		}
	} else {
		canvasEvent = gesture as CanvasEvent;
	}

	// Save eventStartSnapshot on event start
	if (EVENT_START_TYPES.includes(canvasEvent.type)) {
		// state.keyPointsCache を読み取り、参照比較で変化があったオブジェクトのみ再計算する
		const oldCache = state.keyPointsCache;
		const newCache: KeyPointsCache = {};
		let cacheChanged = false;
		const keyPoints: Record<string, FrameKeyPoints> = {};

		for (const [id, obj] of Object.entries(state.objects)) {
			const cached = oldCache[id];
			if (cached && cached.stateRef === obj) {
				// キャッシュヒット: 参照が同じなので keyPoints も同じ
				newCache[id] = cached;
				keyPoints[id] = cached.keyPoints;
			} else {
				// キャッシュミス: 再計算
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
				// Frame を持たないオブジェクト（connector 等）は newCache に含めない
			}
		}

		// 削除されたオブジェクトのエントリを検出（newCache は state.objects から構築するため自動的に除外される）
		if (Object.keys(newCache).length !== Object.keys(oldCache).length) {
			cacheChanged = true;
		}

		// multiSelectGroup の keyPoints（選択状態に依存するため毎回計算）
		if (state.multiSelectGroup && isTransformedFrame(state.multiSelectGroup)) {
			keyPoints[state.multiSelectGroup.id] = calcFrameKeyPoints(
				state.multiSelectGroup as TransformedFrame,
			);
		}

		// snapCandidates は keyPointsCache が変化した場合のみ再計算する
		const snapCandidatesCache =
			cacheChanged || !state.snapCandidatesCache
				? calcSnapCandidates(state.objects, keyPoints)
				: state.snapCandidatesCache;

		// 選択オブジェクト＋全子孫のIDセットを事前計算する（毎 drag event での再計算を避けるため）
		// dragStart 後に handler が selectedIds を変更した場合は、ObjectEventHandler が上書きする
		const selectedIdsWithDescendants = buildSelectedIdsWithDescendants(
			state.selectedIds,
			state.objects,
		);

		const eventStartSnapshot: EventStartSnapshot = {
			objects: state.objects,
			keyPoints,
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
		// Only commit if objects/rootIds actually changed.
		// （コネクターも rootIds に含まれるため rootIds の比較で検知できる）
		// Guards against phantom undo entries when a drag produces no doc change
		// (e.g. shape drawn below the minimum size threshold).
		const hasDocChanges =
			nextState.objects !== state.objects ||
			nextState.rootIds !== state.rootIds;

		nextState = {
			...nextState,
			eventStartSnapshot: null,
			snapFeedback: null,
			axisLockFeedback: null,
			...(hasDocChanges ? { commitVersion: state.commitVersion + 1 } : {}),
		};
	}

	// Return final state (history recording is handled by canvasReducer)
	return nextState;
};
