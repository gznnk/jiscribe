import { InputDefaultState } from "../../../constants/state/elements/InputDefaultState";
import type { TextableType } from "../../../types/core/TextableType";
import type { TextAlign } from "../../../types/core/TextAlign";
import type { VerticalAlign } from "../../../types/core/VerticalAlign";
import type { InputState } from "../../../types/state/elements/InputState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Create Input state
 */
export const createInputState = ({
	x,
	y,
	width = InputDefaultState.width,
	height = InputDefaultState.height,
	rotation = InputDefaultState.rotation,
	scaleX = InputDefaultState.scaleX,
	scaleY = InputDefaultState.scaleY,
	keepProportion = false,
	fill = InputDefaultState.fill,
	stroke = InputDefaultState.stroke,
	strokeWidth = InputDefaultState.strokeWidth,
	cornerRadius = InputDefaultState.cornerRadius,
	text = "",
	textType = InputDefaultState.textType,
	fontColor = InputDefaultState.fontColor,
	fontSize = InputDefaultState.fontSize,
	fontFamily = InputDefaultState.fontFamily,
	fontWeight = InputDefaultState.fontWeight,
	textAlign = InputDefaultState.textAlign,
	verticalAlign = InputDefaultState.verticalAlign,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	keepProportion?: boolean;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	cornerRadius?: number;
	text?: string;
	textType?: TextableType;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
}): InputState => {
	// Create connect points for the input
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	return {
		...InputDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		keepProportion,
		fill,
		stroke,
		strokeWidth,
		cornerRadius,
		text,
		textType,
		fontColor,
		fontSize,
		fontFamily,
		fontWeight,
		textAlign,
		verticalAlign,
		connectPoints,
	};
};
