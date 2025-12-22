import type { ToolDefinition } from "@workspace/llm-client";

/**
 * Description text for the connect_shapes tool.
 * Explains the purpose and behavior of shape connections with customization options.
 */
const TOOL_DESCRIPTION = `
Creates a customizable connection between two shapes on the canvas.
The connection can be styled with different arrow heads, line styles, and path types.
Supports connecting any shapes (not just nodes) with full control over the connection appearance.

When connected, the output from the source shape can be sent as input to the target shape.

Returns a JSON object containing the connection properties (sourceShapeId, targetShapeId, startArrowHead, endArrowHead, lineStyle, pathType, sourceAnchor, targetAnchor).

Available options (all optional parameters, provide empty string to use defaults):
- startArrowHead: Arrow style at connection start (FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None)
- endArrowHead: Arrow style at connection end (FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None)
- lineStyle: Line pattern (solid, dashed, dotted)
- pathType: Path rendering (Straight, Polyline, Curve, Rounded)
- sourceAnchor: Connection point name on source shape (topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint)
- targetAnchor: Connection point name on target shape (topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint)
`;

/**
 * Tool definition for connecting shapes on the canvas with customization options.
 * Conforms to the llm-client ToolDefinition interface.
 */
export const connectShapesToolDefinition: ToolDefinition = {
	name: "connect_shapes",
	description: TOOL_DESCRIPTION,
	parameters: [
		{
			name: "sourceShapeId",
			type: "string",
			description:
				"The ID of the source shape from which the connection will start.",
		},
		{
			name: "targetShapeId",
			type: "string",
			description:
				"The ID of the target shape to which the connection will end.",
		},
		{
			name: "startArrowHead",
			type: "string",
			description:
				"Arrow head style at the start of the connection. Provide empty string to omit arrow head at start. Options: FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None, or empty string for no arrow.",
			enum: [
				"",
				"FilledTriangle",
				"ConcaveTriangle",
				"OpenArrow",
				"HollowTriangle",
				"FilledDiamond",
				"HollowDiamond",
				"Circle",
				"None",
			],
		},
		{
			name: "endArrowHead",
			type: "string",
			description:
				"Arrow head style at the end of the connection. Provide empty string to use default (FilledTriangle). Options: FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None, or empty string for default.",
			enum: [
				"",
				"FilledTriangle",
				"ConcaveTriangle",
				"OpenArrow",
				"HollowTriangle",
				"FilledDiamond",
				"HollowDiamond",
				"Circle",
				"None",
			],
		},
		{
			name: "lineStyle",
			type: "string",
			description:
				"Line style for the connection. Provide empty string to use default (solid). Options: solid, dashed, dotted, or empty string for default.",
			enum: ["", "solid", "dashed", "dotted"],
		},
		{
			name: "pathType",
			type: "string",
			description:
				"Path rendering type. Provide empty string to use default (Polyline). Options: Straight (single straight line), Polyline (zigzag lines), Curve (curved), Rounded (straight lines with rounded corners), or empty string for default.",
			enum: ["", "Straight", "Polyline", "Curve", "Rounded"],
		},
		{
			name: "sourceAnchor",
			type: "string",
			description:
				"Name of the connection point on the source shape. Provide empty string to auto-determine. Valid names: topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint, or empty string for auto-determination.",
			enum: [
				"",
				"topLeftPoint",
				"topCenterPoint",
				"topRightPoint",
				"leftCenterPoint",
				"rightCenterPoint",
				"bottomLeftPoint",
				"bottomCenterPoint",
				"bottomRightPoint",
			],
		},
		{
			name: "targetAnchor",
			type: "string",
			description:
				"Name of the connection point on the target shape. Provide empty string to auto-determine. Valid names: topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint, or empty string for auto-determination.",
			enum: [
				"",
				"topLeftPoint",
				"topCenterPoint",
				"topRightPoint",
				"leftCenterPoint",
				"rightCenterPoint",
				"bottomLeftPoint",
				"bottomCenterPoint",
				"bottomRightPoint",
			],
		},
	],
};
