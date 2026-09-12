import styled from "@emotion/styled";
import type { FillPaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint } from "@jiscribe/canvas-sdk";

/**
 * The paper itself. Its fill arrives already resolved (`resolveAutoColor`) and
 * goes on through CSS, opacity included (issue #38 / doc 08; see shapePaint).
 */
export const StickyBody = styled.polygon<FillPaintProps>`
	${fillPaint}
`;
