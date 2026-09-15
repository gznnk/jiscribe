/**
 * The paint declarations every styled shape element shares, written once here so
 * a shape's stroke and fill are stated the same way wherever they are drawn.
 *
 * Both halves go through CSS rather than SVG presentation attributes: `"auto"`
 * resolves to a `var(--jiscribe-*)` token, which an attribute does not evaluate
 * (resolveAutoColor / doc 08), and the opacity beside the color follows the same
 * route so one element's paint is not split across two mechanisms.
 *
 * None of the props is named after the CSS property it feeds (`fillColor`,
 * `fillAlpha`, …): emotion writes every prop that is a valid SVG attribute onto
 * the element, so `fill` or `fillOpacity` would come out as an attribute as well.
 */

/** The stroke half of a styled shape element's props. */
export type StrokePaintProps = {
	/** Resolved stroke color, `"auto"` already turned into the theme ink. */
	strokeColor: string;
	/** Stroke opacity from 0 to 1, drawn as `stroke-opacity`; omitted draws fully opaque (the CSS initial value). */
	strokeAlpha?: number;
};

/** The fill half of a styled shape element's props. */
export type FillPaintProps = {
	/** Resolved fill color, `"auto"` already turned into the theme surface. */
	fillColor: string;
	/** Fill opacity from 0 to 1, drawn as `fill-opacity`; omitted draws fully opaque (the CSS initial value). */
	fillAlpha?: number;
};

/**
 * The stroke declarations of a styled element, to interpolate in place of a
 * hand-written `stroke:` line (`` styled.rect`${strokePaint}` ``).
 *
 * @param props - The element's own props; only the two stroke fields are read, so an element carrying more may be passed whole
 * @returns The `stroke` declaration, followed by `stroke-opacity` only where an opacity is given
 */
export const strokePaint = ({
	strokeColor,
	strokeAlpha,
}: StrokePaintProps): string => `
	stroke: ${strokeColor};
	${strokeAlpha === undefined ? "" : `stroke-opacity: ${strokeAlpha};`}
`;

/**
 * The fill declarations of a styled element, to interpolate in place of a
 * hand-written `fill:` line (`` styled.rect`${fillPaint}` ``).
 *
 * @param props - The element's own props; only the two fill fields are read, so an element carrying more may be passed whole
 * @returns The `fill` declaration, followed by `fill-opacity` only where an opacity is given
 */
export const fillPaint = ({ fillColor, fillAlpha }: FillPaintProps): string => `
	fill: ${fillColor};
	${fillAlpha === undefined ? "" : `fill-opacity: ${fillAlpha};`}
`;
