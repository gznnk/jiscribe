
import type { EventBus } from "@workspace/event-bus";
import type { FunctionCallHandler, FunctionCallInfo } from "@workspace/llm-client";
import { useMemo } from "react";

import { EVENT_NAME_CONNECT_SHAPES } from "../../constants/core/EventNames";
import type { ArrowHeadType } from "../../types/core/ArrowHeadType";
import type { PathType } from "../../types/core/PathType";
import type { StrokeDashType } from "../../types/core/StrokeDashType";
import type {
	AnchorPosition,
	ConnectShapesEvent,
} from "../../types/events/ConnectShapesEvent";
import { newEventId } from "../../utils/core/newEventId";

/**
 * React hook to dispatch ConnectShapesEvent using the shared event bus.
 * This is a more generic version of useConnectNodesTool that supports
 * connecting any shapes (not just nodes) with customizable line styles,
 * arrow heads, and anchor positions.
 *
 * Returns a memoized function that can be used as a FunctionCallHandler.
 */
export const useConnectShapesTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	return useMemo<FunctionCallHandler>(
		() => (functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				sourceShapeId: string;
				targetShapeId: string;
				startArrowHead?: ArrowHeadType;
				endArrowHead?: ArrowHeadType;
				lineStyle?: StrokeDashType;
				pathType?: PathType;
				sourceAnchor?: AnchorPosition;
				targetAnchor?: AnchorPosition;
			};

			// Debug: Log all arguments received from AI
			console.log("🔧 [ConnectShapesTool] AI called with arguments:", {
				sourceShapeId: args.sourceShapeId,
				targetShapeId: args.targetShapeId,
				startArrowHead: args.startArrowHead,
				endArrowHead: args.endArrowHead,
				lineStyle: args.lineStyle,
				pathType: args.pathType,
				sourceAnchor: args.sourceAnchor,
				targetAnchor: args.targetAnchor,
				// Show type and value for debugging
				types: {
					startArrowHead: typeof args.startArrowHead,
					endArrowHead: typeof args.endArrowHead,
					lineStyle: typeof args.lineStyle,
					pathType: typeof args.pathType,
					sourceAnchor: typeof args.sourceAnchor,
					targetAnchor: typeof args.targetAnchor,
				},
			});

			// Validate required parameters
			if (
				typeof args.sourceShapeId !== "string" ||
				typeof args.targetShapeId !== "string"
			) {
				console.error(
					"ConnectShapesTool: sourceShapeId and targetShapeId are required",
				);
				return null;
			}

			// Normalize empty strings to undefined for optional parameters
			const startArrowHead =
				args.startArrowHead && args.startArrowHead.trim() !== ""
					? args.startArrowHead
					: undefined;
			const endArrowHead =
				args.endArrowHead && args.endArrowHead.trim() !== ""
					? args.endArrowHead
					: undefined;
			const lineStyle =
				args.lineStyle && args.lineStyle.trim() !== ""
					? args.lineStyle
					: undefined;
			const pathType =
				args.pathType && args.pathType.trim() !== ""
					? args.pathType
					: undefined;
			const sourceAnchor =
				args.sourceAnchor && args.sourceAnchor.trim() !== ""
					? args.sourceAnchor
					: undefined;
			const targetAnchor =
				args.targetAnchor && args.targetAnchor.trim() !== ""
					? args.targetAnchor
					: undefined;

			// Validate optional arrow head types
			if (
				startArrowHead !== undefined &&
				!isValidArrowHeadType(startArrowHead)
			) {
				console.error(
					`ConnectShapesTool: Invalid startArrowHead type: ${startArrowHead}`,
				);
				return null;
			}

			if (endArrowHead !== undefined && !isValidArrowHeadType(endArrowHead)) {
				console.error(
					`ConnectShapesTool: Invalid endArrowHead type: ${endArrowHead}`,
				);
				return null;
			}

			// Validate optional line style
			if (lineStyle !== undefined && !isValidLineStyle(lineStyle)) {
				console.error(`ConnectShapesTool: Invalid lineStyle: ${lineStyle}`);
				return null;
			}

			// Validate optional path type
			if (pathType !== undefined && !isValidPathType(pathType)) {
				console.error(`ConnectShapesTool: Invalid pathType: ${pathType}`);
				return null;
			}

			// Create and dispatch the event
			const event: ConnectShapesEvent = {
				eventId: newEventId(),
				sourceShapeId: args.sourceShapeId,
				targetShapeId: args.targetShapeId,
				startArrowHead,
				endArrowHead,
				lineStyle,
				pathType,
				sourceAnchor,
				targetAnchor,
			};

			// Debug: Log normalized event being dispatched
			console.log("📤 [ConnectShapesTool] Dispatching event:", {
				sourceShapeId: event.sourceShapeId,
				targetShapeId: event.targetShapeId,
				startArrowHead: event.startArrowHead,
				endArrowHead: event.endArrowHead,
				lineStyle: event.lineStyle,
				pathType: event.pathType,
				sourceAnchor: event.sourceAnchor,
				targetAnchor: event.targetAnchor,
			});

			const customEvent = new CustomEvent(EVENT_NAME_CONNECT_SHAPES, {
				detail: event,
			});
			eventBus.dispatchEvent(customEvent);

			// Return the connection data for confirmation
			return {
				sourceShapeId: args.sourceShapeId,
				targetShapeId: args.targetShapeId,
				startArrowHead,
				endArrowHead,
				lineStyle,
				pathType,
				sourceAnchor,
				targetAnchor,
			};
		},
		[eventBus],
	);
};

/**
 * Validates if a value is a valid ArrowHeadType
 */
const isValidArrowHeadType = (value: string): value is ArrowHeadType => {
	return [
		"FilledTriangle",
		"ConcaveTriangle",
		"OpenArrow",
		"HollowTriangle",
		"FilledDiamond",
		"HollowDiamond",
		"Circle",
		"None",
	].includes(value);
};

/**
 * Validates if a value is a valid StrokeDashType
 */
const isValidLineStyle = (value: string): value is StrokeDashType => {
	return ["solid", "dashed", "dotted"].includes(value);
};

/**
 * Validates if a value is a valid PathType
 */
const isValidPathType = (value: string): value is PathType => {
	return ["Straight", "Polyline", "Curve", "Rounded"].includes(value);
};
