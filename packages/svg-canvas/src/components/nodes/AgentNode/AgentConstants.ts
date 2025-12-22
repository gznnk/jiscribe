// Import other libraries.
import type { OpenAI } from "openai";

export const AI_AGENT_INSTRUCTIONS = `
You are an AI agent responsible for building workflows by calling available functions.  
Use the provided tools to create workflows based strictly on user input.  
Only create the minimum necessary workflow to achieve the user's request.  
Always choose functions carefully and avoid unnecessary or redundant calls.  
Do not invent new functions or tools; only use those that are provided.  

When placing nodes on the canvas, arrange them horizontally from left to right by setting appropriate X and Y coordinates.  
When placing the first node, position it near the center of the currently visible area of the canvas.  
When arranging nodes horizontally, maintain a fixed horizontal spacing of 100 pixels between the right edge of a node and the left edge of the next node.  
If a node has multiple outgoing connections (branching), you must offset the target nodes downward (in the positive Y direction) to prevent overlap and ensure a clear layout.  
When multiple target nodes are created from a single branching point, maintain a fixed horizontal spacing of 100 pixels between each of the target nodes.  
Always connect all nodes appropriately according to the workflow structure.  
Do not leave any created nodes unconnected unless explicitly instructed otherwise.

When generating natural language responses, always use the same language as the user's input.
`;

export const ADD_TEXT_NODE_DESCRIPTION = `
Adds a text node to the canvas that handles text input and output.
When connected from the text node to an LLM node, it sends input text.
When connected from an LLM node to the text node, it displays the LLM's output.
The size of the text node is 400 pixels wide and 200 pixels tall.
Returns a JSON object containing the node ID, node type and the size (width and height).
`;

export const ADD_LLM_NODE_DESCRIPTION = `
Adds an LLM node to the canvas that communicates with OpenAI's Response API using the GPT-4o model.
The node accepts text input from connected text nodes and sends generated output to connected text nodes.
The "instructions" parameter must be provided to define the system prompt for the LLM.
The size of the LLM node is 100 pixels wide and 100 pixels tall.
Returns a JSON object containing the node ID, node type, the instructions used, and the size (width and height).
`;

export const LLM_NODE_INSTRACTIONS_PARAM_DESCRIPTION = `
Defines the "instructions" parameter to provide a clear, concise, and professional system prompt for the model.  
The prompt should always be written in English and guide the model to produce high-quality, logical, and context-appropriate responses.  
It will be inserted as the first message in the model's context.
`;

export const ADD_SVG_TO_CANVAS_NODE_DESCRIPTION = `
Adds an SvgToDiagram node to the canvas.  
The node receives input from connected LLM or text nodes.  
If the received output is a valid SVG string, it converts the SVG into a shape and adds it to the canvas.  
The SvgToDiagram node does not send any output to other nodes.
The size of the SvgToDiagram node is 100 pixels wide and 100 pixels tall.
Returns a JSON object containing the node ID, node type and the size (width and height).
`;

export const ADD_IMAGE_GEN_NODE_DESCRIPTION = `
Adds an ImageGeneration node to the canvas.  
The node receives input from connected LLM or text nodes.  
It uses the "gpt-image-1" model to generate an image based on the received input and outputs the generated image onto the canvas.  
The ImageGeneration node does not send any output to other nodes.
The size of the ImageGeneration node is 100 pixels wide and 100 pixels tall.
Returns a JSON object containing the node ID, node type and the size (width and height).
`;

export const AI_AGENT_TOOLS = [
	{
		type: "function",
		name: "add_llm_node",
		description: ADD_LLM_NODE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				instructions: {
					type: "string",
					description: LLM_NODE_INSTRACTIONS_PARAM_DESCRIPTION,
				},
				x: {
					type: "number",
					description:
						"The X coordinate of the center of the node on the canvas.",
				},
				y: {
					type: "number",
					description:
						"The Y coordinate of the center of the node on the canvas.",
				},
			},
			additionalProperties: false,
			required: ["instructions", "x", "y"],
		},
		strict: true,
	},
	{
		type: "function",
		name: "add_text_node",
		description: ADD_TEXT_NODE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				x: {
					type: "number",
					description:
						"The X coordinate of the center of the node on the canvas.",
				},
				y: {
					type: "number",
					description:
						"The Y coordinate of the center of the node on the canvas.",
				},
			},
			additionalProperties: false,
			required: ["x", "y"],
		},
		strict: true,
	},
	{
		type: "function",
		name: "add_svg_to_canvas_node",
		description: ADD_SVG_TO_CANVAS_NODE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				x: {
					type: "number",
					description:
						"The X coordinate of the center of the node on the canvas.",
				},
				y: {
					type: "number",
					description:
						"The Y coordinate of the center of the node on the canvas.",
				},
			},
			additionalProperties: false,
			required: ["x", "y"],
		},
		strict: true,
	},
	{
		type: "function",
		name: "add_image_gen_node",
		description: ADD_IMAGE_GEN_NODE_DESCRIPTION,
		parameters: {
			type: "object",
			properties: {
				x: {
					type: "number",
					description:
						"The X coordinate of the center of the node on the canvas.",
				},
				y: {
					type: "number",
					description:
						"The Y coordinate of the center of the node on the canvas.",
				},
			},
			additionalProperties: false,
			required: ["x", "y"],
		},
		strict: true,
	},
	{
		type: "function",
		name: "connect_shapes",
		description:
			"Connects two shapes on the canvas with a customizable connection line. Supports various arrow heads, line styles, path types, and anchor positions.",
		parameters: {
			type: "object",
			properties: {
				sourceShapeId: {
					type: "string",
					description:
						"The ID of the source shape where the connection starts.",
				},
				targetShapeId: {
					type: "string",
					description: "The ID of the target shape where the connection ends.",
				},
				startArrowHead: {
					type: "string",
					description:
						"Arrow head style at the start (FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None, or empty string for no arrow).",
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
				endArrowHead: {
					type: "string",
					description:
						"Arrow head style at the end (FilledTriangle, ConcaveTriangle, OpenArrow, HollowTriangle, FilledDiamond, HollowDiamond, Circle, None, or empty string for default FilledTriangle).",
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
				lineStyle: {
					type: "string",
					description:
						"Line style (solid, dashed, dotted, or empty string for default solid).",
					enum: ["", "solid", "dashed", "dotted"],
				},
				pathType: {
					type: "string",
					description:
						"Path rendering type (Straight, Polyline, Curve, Rounded, or empty string for default Polyline).",
					enum: ["", "Straight", "Polyline", "Curve", "Rounded"],
				},
				sourceAnchor: {
					type: "string",
					description:
						"Connection point on source shape (topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint, or empty string for auto).",
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
				targetAnchor: {
					type: "string",
					description:
						"Connection point on target shape (topLeftPoint, topCenterPoint, topRightPoint, leftCenterPoint, rightCenterPoint, bottomLeftPoint, bottomCenterPoint, bottomRightPoint, or empty string for auto).",
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
			},
			required: ["sourceShapeId", "targetShapeId"],
			additionalProperties: false,
		},
		strict: true,
	},
] as const satisfies OpenAI.Responses.Tool[];
