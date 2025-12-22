import { TextAreaNodeDefaultState } from "../../../constants/state/nodes/TextAreaNodeDefaultState";
import type { TextAreaNodeState } from "../../../types/state/nodes/TextAreaNodeState";
import { createInputState } from "../../elements/input/createInputState";
import { createNodeHeaderState } from "../../elements/nodeHeader/createNodeHeaderState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for a TextArea node with specified properties.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @param width - Optional width of the node
 * @param height - Optional height of the node
 * @param rotation - Optional rotation of the node
 * @param scaleX - Optional x scale of the node
 * @param scaleY - Optional y scale of the node
 * @param minWidth - Optional minimum width of the node
 * @param minHeight - Optional minimum height of the node
 * @returns TextArea node state object
 */
export const createTextAreaNodeState = ({
	x,
	y,
	width = TextAreaNodeDefaultState.width,
	height = TextAreaNodeDefaultState.height,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
	minWidth = TextAreaNodeDefaultState.minWidth,
	minHeight = TextAreaNodeDefaultState.minHeight,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
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

	const state = {
		...TextAreaNodeDefaultState,
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
				x,
				y,
				text: "Text",
			}),
			{
				...createInputState({
					x,
					y,
					verticalAlign: "start",
				}),
				connectPoints: [],
				outlineDisabled: true,
			},
		],
		connectPoints,
	} as TextAreaNodeState;

	return state;
};
