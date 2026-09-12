import styled from "@emotion/styled";

import type { FillPaintProps, StrokePaintProps } from "../../utils/shapePaint";
import { fillPaint, strokePaint } from "../../utils/shapePaint";

export const EllipseElement = styled.ellipse<StrokePaintProps & FillPaintProps>`
	${strokePaint}
	${fillPaint}
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
