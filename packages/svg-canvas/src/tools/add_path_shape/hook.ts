import type { EventBus } from "@workspace/event-bus";
import type { Point } from "@workspace/geometry";
import type {
	FunctionCallHandler,
	FunctionCallInfo,
} from "@workspace/llm-client";
import { useCallback } from "react";

import { useAddDiagramWithBus } from "../../hooks/useAddDiagramWithBus";
import type { ArrowHeadType } from "../../types/core/ArrowHeadType";
import type { PathType } from "../../types/core/PathType";
import type { StrokeDashType } from "../../types/core/StrokeDashType";
import { createPathState } from "../../utils/shapes/path/createPathState";

// TODO: バリデータ使う
// Valid values for validation
const VALID_STROKE_DASH_TYPES: StrokeDashType[] = ["solid", "dashed", "dotted"];
const VALID_PATH_TYPES: PathType[] = [
	"Straight",
	"Polyline",
	"Curve",
	"Rounded",
];
const VALID_ARROW_HEAD_TYPES: ArrowHeadType[] = [
	"FilledTriangle",
	"ConcaveTriangle",
	"OpenArrow",
	"HollowTriangle",
	"FilledDiamond",
	"HollowDiamond",
	"Circle",
	"None",
];

export const useAddPathShapeTool = (
	eventBus: EventBus,
): FunctionCallHandler => {
	const addDiagram = useAddDiagramWithBus(eventBus);
	return useCallback(
		(functionCall: FunctionCallInfo) => {
			const args = functionCall.arguments as {
				x: number;
				y: number;
				points?: Point[];
				stroke?: string;
				strokeWidth?: number;
				strokeDashType?: StrokeDashType;
				pathType?: PathType;
				startArrowHead?: ArrowHeadType;
				endArrowHead?: ArrowHeadType;
			};

			// Validate required parameters
			if (typeof args.x !== "number" || typeof args.y !== "number") {
				console.error("Invalid arguments: x and y must be numbers", args);
				return null;
			}

			// Validate optional numeric parameters
			if (
				args.strokeWidth !== undefined &&
				typeof args.strokeWidth !== "number"
			) {
				console.error(
					"Invalid strokeWidth: must be a number",
					args.strokeWidth,
				);
				return null;
			}

			// Validate stroke color
			if (args.stroke !== undefined && typeof args.stroke !== "string") {
				console.error("Invalid stroke: must be a string", args.stroke);
				return null;
			}

			// Validate strokeDashType
			if (
				args.strokeDashType !== undefined &&
				!VALID_STROKE_DASH_TYPES.includes(args.strokeDashType)
			) {
				console.error(
					`Invalid strokeDashType: must be one of ${VALID_STROKE_DASH_TYPES.join(", ")}`,
					args.strokeDashType,
				);
				return null;
			}

			// Validate pathType
			if (
				args.pathType !== undefined &&
				!VALID_PATH_TYPES.includes(args.pathType)
			) {
				console.error(
					`Invalid pathType: must be one of ${VALID_PATH_TYPES.join(", ")}`,
					args.pathType,
				);
				return null;
			}

			// Validate startArrowHead
			if (
				args.startArrowHead !== undefined &&
				!VALID_ARROW_HEAD_TYPES.includes(args.startArrowHead)
			) {
				console.error(
					`Invalid startArrowHead: must be one of ${VALID_ARROW_HEAD_TYPES.join(", ")}`,
					args.startArrowHead,
				);
				return null;
			}

			// Validate endArrowHead
			if (
				args.endArrowHead !== undefined &&
				!VALID_ARROW_HEAD_TYPES.includes(args.endArrowHead)
			) {
				console.error(
					`Invalid endArrowHead: must be one of ${VALID_ARROW_HEAD_TYPES.join(", ")}`,
					args.endArrowHead,
				);
				return null;
			}

			// Validate points array
			if (args.points !== undefined) {
				if (!Array.isArray(args.points)) {
					console.error("Invalid points: must be an array", args.points);
					return null;
				}

				// Validate each point has x and y coordinates
				for (let i = 0; i < args.points.length; i++) {
					const point = args.points[i];
					if (
						typeof point.x !== "number" ||
						typeof point.y !== "number" ||
						!Number.isFinite(point.x) ||
						!Number.isFinite(point.y)
					) {
						console.error(
							`Invalid point at index ${i}: must have numeric x and y coordinates`,
							point,
						);
						return null;
					}
				}

				// Require at least 2 points if points array is provided
				if (args.points.length < 2) {
					console.error(
						"Invalid points: must have at least 2 points",
						args.points,
					);
					return null;
				}
			}

			const data = createPathState({
				x: args.x,
				y: args.y,
				items: args.points,
				stroke: args.stroke,
				strokeWidth: args.strokeWidth,
				strokeDashType: args.strokeDashType,
				pathType: args.pathType,
				startArrowHead: args.startArrowHead,
				endArrowHead: args.endArrowHead,
			});

			addDiagram(data);

			return {
				id: data.id,
				type: "Path",
				pointCount: data.items.length,
				stroke: data.stroke,
				strokeWidth: data.strokeWidth,
				strokeDashType: data.strokeDashType,
				pathType: data.pathType,
				startArrowHead: data.startArrowHead,
				endArrowHead: data.endArrowHead,
			};
		},
		[addDiagram],
	);
};
