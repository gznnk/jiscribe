/**
 * One SVG element of an icon's drawing: the tag to emit and its attributes, in
 * lucide's own node format. Attribute names are already React-cased, so a renderer
 * hands them to `createElement` untouched.
 *
 * Coordinates are in lucide's 24x24 grid; the renderer scales that grid to the
 * shape's box rather than rewriting the numbers.
 */
export type IconNode = readonly [
	tag: string,
	attrs: Readonly<Record<string, string>>,
];
