import { degreesToRadians , efficientAffineTransformation } from "@workspace/geometry";

import { createLLMNodeInputFrame } from "./createLLMNodeInputFrame";
import { LLMNodeDefaultState } from "../../../constants/state/nodes/LLMNodeDefaultState";
import {
	HEADER_HEIGHT,
	HEADER_MARGIN_TOP,
} from "../../../constants/styling/nodes/NodeStyling";
import type { LLMNodeState } from "../../../types/state/nodes/LLMNodeState";
import { createInputState } from "../../elements/input/createInputState";
import { createNodeHeaderState } from "../../elements/nodeHeader/createNodeHeaderState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for an LLM node with specified properties.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @param width - Optional width of the node
 * @param height - Optional height of the node
 * @param rotation - Optional rotation of the node
 * @param scaleX - Optional x scale of the node
 * @param scaleY - Optional y scale of the node
 * @param text - Optional initial text content
 * @param minWidth - Optional minimum width of the node
 * @param minHeight - Optional minimum height of the node
 * @returns LLM node state object
 */
export const createLLMNodeState = ({
	x,
	y,
	width = LLMNodeDefaultState.width,
	height = LLMNodeDefaultState.height,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
	text = "",
	minWidth = LLMNodeDefaultState.minWidth,
	minHeight = LLMNodeDefaultState.minHeight,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	text?: string;
	minWidth?: number;
	minHeight?: number;
}) => {
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	// Calculate dimensions and positions for child elements
	const headerCenter = efficientAffineTransformation(
		0,
		-(height / 2 - (HEADER_HEIGHT / 2 + HEADER_MARGIN_TOP)),
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	const inputFrame = createLLMNodeInputFrame({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	const state = {
		...LLMNodeDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		minWidth,
		minHeight,
		items: [
			createNodeHeaderState({
				x: headerCenter.x,
				y: headerCenter.y,
				text: "LLM",
			}),
			{
				...createInputState({
					x: inputFrame.x,
					y: inputFrame.y,
					width: inputFrame.width,
					height: inputFrame.height,
					rotation: inputFrame.rotation,
					scaleX: inputFrame.scaleX,
					scaleY: inputFrame.scaleY,
					text,
					verticalAlign: "start",
				}),
				outlineDisabled: true,
			},
		],
		connectPoints,
	} as LLMNodeState;

	return state;
};
