import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

export const ActorHead = styled.circle<StrokePaintProps & FillPaintProps>`
	${strokePaint}
	${fillPaint}
	pointer-events: none;
`;

export const ActorLimbs = styled.path<StrokePaintProps>`
	${strokePaint}
	fill: none;
	stroke-linecap: round;
	pointer-events: none;
`;
