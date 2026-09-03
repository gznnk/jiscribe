import styled from "@emotion/styled";

/**
 * The paper itself. The fill arrives already resolved (`resolveAutoColor`) and
 * is applied through CSS rather than the `fill` attribute, because `"auto"`
 * resolves to a `var(--jiscribe-*)` token that SVG presentation attributes do
 * not evaluate (issue #38 / doc 08).
 */
export const StickyBody = styled.polygon<{ fillColor: string }>`
	fill: ${({ fillColor }) => fillColor};
`;
