import { ConnectorClickHandler } from "./ConnectorClickHandler";
import { ConnectorLabelDragHandler } from "./ConnectorLabelDragHandler";
import { ConnectorSegmentMoveHandler } from "./ConnectorSegmentMoveHandler";
import { ConnectorSegmentSlideHandler } from "./ConnectorSegmentSlideHandler";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { commitTextEditUnlessTouchPress } from "../utils/commitTextEditUnlessTouchPress";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * Sub-handlers of the "connector" targetKind, exported for the exclusivity test.
 */
export const CONNECTOR_HANDLERS: readonly GestureHandler[] = [
	ConnectorLabelDragHandler,
	ConnectorSegmentSlideHandler,
	ConnectorSegmentMoveHandler,
	ConnectorClickHandler,
];

/**
 * Main handler for all connector-level events.
 * Routes each event to the first sub-handler whose supports() accepts it:
 * clicks (click / pressed / doubleClick) to ConnectorClickHandler, drags on the
 * label box to ConnectorLabelDragHandler, drags on a "segment-slide:<i>" band to
 * ConnectorSegmentSlideHandler, and on a "segment-move:<i>" band to
 * ConnectorSegmentMoveHandler. Their supports() are mutually exclusive, so
 * the array order never decides routing.
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "connector" && isPerTargetInteraction(event);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		// The one commit for every sub-handler, ahead of routing (deferred for a
		// touch press): a dragStart's lands in the snapshot before any frame, and a
		// drag no sub-handler claims (one on the bare line) ends the edit too.
		const nextState = commitTextEditUnlessTouchPress(state, event);
		for (const handler of CONNECTOR_HANDLERS) {
			if (handler.supports(event)) {
				return handler.handle(nextState, event, registries);
			}
		}

		// Events no sub-handler claims (a drag on the bare line, say) pass through
		return nextState;
	},
};
