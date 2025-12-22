import { HtmlGenNodeDefaultState } from "../../../constants/state/nodes/HtmlGenNodeDefaultState";
import type { HtmlGenNodeState } from "../../../types/state/nodes/HtmlGenNodeState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for an HTML Generation node with specified properties.
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
 * @returns HTML Generation node state object
 */
export const createHtmlGenNodeState = ({
	x,
	y,
	width = HtmlGenNodeDefaultState.width,
	height = HtmlGenNodeDefaultState.height,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
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

	const state = {
		...HtmlGenNodeDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		connectPoints,
	} as HtmlGenNodeState;

	return state;
};
