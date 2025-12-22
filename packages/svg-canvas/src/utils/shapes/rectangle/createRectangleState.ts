import { createRectangleConnectPoint } from "./createRectangleConnectPoint";
import { RectangleDefaultState } from "../../../constants/state/shapes/RectangleDefaultState";
import type { TextableType } from "../../../types/core/TextableType";
import type { TextAlign } from "../../../types/core/TextAlign";
import type { VerticalAlign } from "../../../types/core/VerticalAlign";
import type { RectangleState } from "../../../types/state/shapes/RectangleState";
import { newId } from "../../../utils/shapes/common/newId";

/**
 * Creates rectangle state with the specified properties.
 *
 * @param params - Rectangle parameters including position, size, style and text properties.
 * @returns The created rectangle state object.
 */
export const createRectangleState = ({
	x,
	y,
	width = 100,
	height = 100,
	cornerRadius = 0,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
	keepProportion = false,
	fill = "transparent",
	stroke = "black",
	strokeWidth = 1,
	text = "",
	textType = "textarea",
	textAlign = "center",
	verticalAlign = "center",
	fontColor = "black",
	fontSize = 16,
	fontFamily = "Noto Sans JP",
	fontWeight = "normal",
	connectEnabled = true,
	name,
	description,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	cornerRadius?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	keepProportion?: boolean;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	text?: string;
	textType?: TextableType;
	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	connectEnabled?: boolean;
	name?: string;
	description?: string;
}): RectangleState => {
	const connectPoints = connectEnabled
		? createRectangleConnectPoint({
				x,
				y,
				width,
				height,
				rotation,
				scaleX,
				scaleY,
			})
		: [];

	return {
		...RectangleDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		cornerRadius,
		rotation,
		scaleX,
		scaleY,
		keepProportion,
		fill,
		stroke,
		strokeWidth,
		text,
		textType,
		textAlign,
		verticalAlign,
		fontColor,
		fontSize,
		fontFamily,
		fontWeight,
		connectEnabled,
		connectPoints,
		name,
		description,
	} as RectangleState;
};
