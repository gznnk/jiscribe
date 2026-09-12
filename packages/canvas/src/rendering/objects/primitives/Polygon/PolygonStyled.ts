import styled from "@emotion/styled";

import type { FillPaintProps, StrokePaintProps } from "../../utils/shapePaint";
import { fillPaint, strokePaint } from "../../utils/shapePaint";

export const PolygonElement = styled.polygon<StrokePaintProps & FillPaintProps>`
	${strokePaint}
	${fillPaint}
	pointer-events: all;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
