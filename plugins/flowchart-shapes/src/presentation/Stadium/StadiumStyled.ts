import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

export const StadiumElement = styled.rect<StrokePaintProps & FillPaintProps>`
	${strokePaint}
	${fillPaint}
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
