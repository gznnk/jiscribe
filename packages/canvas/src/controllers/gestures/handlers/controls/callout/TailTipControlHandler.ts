import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import type { CalloutTailSide } from "../../../../../schemas/objects/annotations/callout/CalloutDoc";
import type { CalloutState } from "../../../../../states/objects/annotations/callout/CalloutState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { createCowObjects } from "../../../../utils/cowObjects";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { SelectionControlHandler } from "../../../registry/SelectionControlHandler";

/** Decimal places for tail.position (a 0..1 ratio; 4 ≒ sub-pixel up to ~10k px boxes). */
const TAIL_POSITION_PRECISION = 4;

/**
 * Handles the callout tail-tip control (free 2D drag of the tail tip).
 * The pointer is normalized into the tail model: `side` from the dominant
 * axis in local coordinates, `position` from the projection onto that edge.
 *
 * Target format: data-id=<objectId>, data-part="selection:callout:tailTip"
 * Registered via the callout's ObjectTypeDefinition.selectionControls.
 */
export class TailTipControlHandler extends SelectionControlHandler {
	constructor() {
		super("callout", "tailTip");
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const objectId = event.targetId;
		if (!objectId) {
			return state;
		}

		if (event.type === "dragStart") {
			return {
				...state,
				edgeScrollEnabled: true,
				objectMenuOpenId: null,
				shapeLibraryOpenCategory: null,
			};
		}
		if (event.type === "drag") {
			return this.handleDrag(state, event, objectId);
		}
		if (event.type === "dragEnd") {
			// Apply the drag-time update as is; the callout's geometry is
			// unchanged, so no group-bounds refresh is needed.
			return {
				...this.handleDrag(state, event, objectId),
				edgeScrollEnabled: false,
			};
		}

		return state;
	}

	private handleDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
		objectId: string,
	): CanvasControllerState {
		const eventStartSnapshot = state.eventStartSnapshot;
		if (!eventStartSnapshot) {
			return state;
		}

		const startObject = eventStartSnapshot.objects[objectId];
		if (!startObject || startObject.type !== "callout") {
			return state;
		}
		const startCallout = startObject as CalloutState;
		const { width, height } = startCallout;

		const radians = degreesToRadians(startCallout.rotation);
		const localPoint = calcInverseAffineTransformedPoint(
			event.last.x,
			event.last.y,
			startCallout.scaleX,
			startCallout.scaleY,
			radians,
			startCallout.cx,
			startCallout.cy,
		);

		// Side from the dominant axis (local coordinates normalized to half extents)
		const normalizedX = width === 0 ? 0 : localPoint.x / (width / 2);
		const normalizedY = height === 0 ? 0 : localPoint.y / (height / 2);
		const side: CalloutTailSide =
			Math.abs(normalizedX) >= Math.abs(normalizedY)
				? normalizedX >= 0
					? "right"
					: "left"
				: normalizedY >= 0
					? "bottom"
					: "top";

		// Position from the projection onto the chosen edge, clamped to [0, 1]
		const rawPosition =
			side === "top" || side === "bottom"
				? width === 0
					? 0.5
					: (localPoint.x + width / 2) / width
				: height === 0
					? 0.5
					: (localPoint.y + height / 2) / height;
		const position = roundToDecimal(
			Math.min(Math.max(rawPosition, 0), 1),
			TAIL_POSITION_PRECISION,
		);

		// COW view over the previous frame's map (rebased internally, #213)
		const updatedCallout: CalloutState = {
			...startCallout,
			tail: { side, position },
		};
		const updatedObjects = createCowObjects(state.objects);
		updatedObjects[objectId] = updatedCallout;

		return { ...state, objects: updatedObjects };
	}
}
