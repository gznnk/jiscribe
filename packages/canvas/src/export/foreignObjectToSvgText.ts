/**
 * Converts foreignObject (HTML text) into native SVG `<text>`.
 *
 * An SVG containing foreignObject taints the canvas when drawn via `<img>`,
 * which blocks PNG export, and Markdown renderers such as GitHub sanitize
 * foreignObject away. So at export time text is replaced with
 * `<text>`/`<tspan>`, producing an SVG that renders everywhere and can be
 * rasterized.
 *
 * Markdown is flattened to plain text (`innerText`); rich decorations such as
 * tables and lists are not reproduced in this phase.
 *
 * Two DOM shapes are converted, each by its own entry point: text overlays
 * (`foreignObject > wrapper > content`, the TextOverlayFrame contract) and
 * connector labels (`foreignObject > LabelBox`, which also paints a background
 * and border).
 */

import { borderStyleToDasharray } from "./borderStyleToDasharray";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Vertical placement (flex align-items) → block placement mapping. */
type VerticalPlacement = "top" | "middle" | "bottom";

const toVerticalPlacement = (alignItems: string): VerticalPlacement => {
	if (alignItems === "flex-start") {
		return "top";
	}
	if (alignItems === "flex-end") {
		return "bottom";
	}
	return "middle";
};

/** text-align → SVG text-anchor mapping. */
const toTextAnchor = (textAlign: string): "start" | "middle" | "end" => {
	if (textAlign === "left") {
		return "start";
	}
	if (textAlign === "right") {
		return "end";
	}
	return "middle";
};

const parsePxOr = (value: string, fallback: number): number => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

/** True for a color that paints nothing (keyword or zero alpha). */
const isFullyTransparent = (color: string): boolean => {
	if (color === "" || color === "transparent") {
		return true;
	}
	const alpha = color.match(/^rgba?\([^)]*,\s*([\d.]+)\s*\)$/);
	return alpha !== null && Number.parseFloat(alpha[1]) === 0;
};

/**
 * Splits a token by adding one character at a time while it fits into
 * maxWidth (for long words and CJK break-word behavior).
 */
const breakLongToken = (
	token: string,
	maxWidth: number,
	measure: (text: string) => number,
): string[] => {
	const chunks: string[] = [];
	let current = "";
	for (const char of token) {
		const candidate = current + char;
		if (current !== "" && measure(candidate) > maxWidth) {
			chunks.push(current);
			current = char;
		} else {
			current = candidate;
		}
	}
	if (current !== "") {
		chunks.push(current);
	}
	return chunks;
};

/**
 * Word-wraps one paragraph into an array of lines. Prefers word (space)
 * boundaries and falls back to per-character breaking when a single word
 * exceeds the width.
 */
const wrapParagraph = (
	paragraph: string,
	maxWidth: number,
	measure: (text: string) => number,
): string[] => {
	if (paragraph === "") {
		return [""];
	}
	const words = paragraph.split(/ +/);
	const lines: string[] = [];
	let line = "";

	const pushBrokenWord = (word: string): void => {
		const chunks = breakLongToken(word, maxWidth, measure);
		for (let i = 0; i < chunks.length - 1; i++) {
			lines.push(chunks[i]);
		}
		line = chunks[chunks.length - 1] ?? "";
	};

	for (const word of words) {
		if (line === "") {
			if (measure(word) > maxWidth) {
				pushBrokenWord(word);
			} else {
				line = word;
			}
			continue;
		}
		const candidate = `${line} ${word}`;
		if (measure(candidate) <= maxWidth) {
			line = candidate;
		} else {
			lines.push(line);
			if (measure(word) > maxWidth) {
				pushBrokenWord(word);
			} else {
				line = word;
			}
		}
	}
	if (line !== "") {
		lines.push(line);
	}
	return lines;
};

/** Geometry attributes of the cloned foreignObject (parent user units). */
type ForeignObjectGeometry = {
	x: number;
	y: number;
	width: number;
	height: number;
	transform: string | null;
};

const readForeignObjectGeometry = (
	clonedForeignObject: Element,
): ForeignObjectGeometry => ({
	x: parsePxOr(clonedForeignObject.getAttribute("x") ?? "0", 0),
	y: parsePxOr(clonedForeignObject.getAttribute("y") ?? "0", 0),
	width: parsePxOr(clonedForeignObject.getAttribute("width") ?? "0", 0),
	height: parsePxOr(clonedForeignObject.getAttribute("height") ?? "0", 0),
	transform: clonedForeignObject.getAttribute("transform"),
});

/** Rendered text of an element, with nbsp normalized. Null when blank. */
const readRenderedText = (element: Element): string | null => {
	const content = (
		(element as HTMLElement).innerText ??
		element.textContent ??
		""
	).replace(/\u00a0/g, " ");
	return content.trim() === "" ? null : content;
};

/** Text painting parameters resolved from a computed style. */
type SvgTextStyle = {
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
	fontStyle: string;
	/** CSS text-decoration-line, already reduced to the line keywords ("none" when undecorated). */
	textDecoration: string;
	fill: string;
	/** Line box height in user units. */
	lineHeight: number;
	/** Horizontal alignment inside the box. */
	anchor: "start" | "middle" | "end";
	/** Vertical placement of the text block inside the box. */
	placement: VerticalPlacement;
};

/**
 * @param textStyle - Computed style of the element holding the text
 * @param alignItems - Computed `align-items` of the flex box laying that
 *   element out (it may be the same element)
 */
const readSvgTextStyle = (
	textStyle: CSSStyleDeclaration,
	alignItems: string,
): SvgTextStyle => {
	const fontSize = parsePxOr(textStyle.fontSize, 16);
	return {
		fontSize,
		fontFamily: textStyle.fontFamily || "sans-serif",
		fontWeight: textStyle.fontWeight || "normal",
		fontStyle: textStyle.fontStyle || "normal",
		// The `textDecoration` shorthand also computes style/color/thickness
		// ("none solid rgb(0, 0, 0)"), which SVG's text-decoration cannot take.
		textDecoration: textStyle.textDecorationLine || "none",
		fill: textStyle.color || "#000000",
		lineHeight: parsePxOr(textStyle.lineHeight, fontSize * 1.5),
		anchor: toTextAnchor(textStyle.textAlign),
		placement: toVerticalPlacement(alignItems),
	};
};

/** The area text is laid out in: the box, minus the insets around its content. */
type TextLayoutBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Distance from the left/right box edge to the content area (padding + border). */
	insetX: number;
	/** Distance from the top/bottom box edge to the content area (padding + border). */
	insetY: number;
};

/**
 * Builds the `<text>` reproducing the HTML text of a box.
 *
 * Baseline math follows the CSS inline layout model: each line box is
 * `line-height` tall, the font's content box (ascent + descent) is centered
 * in it by half-leading, and the baseline sits at
 * `halfLeading + ascent` from the line box top. Using the real font metrics
 * from TextMetrics (instead of an approximation like `0.8 * fontSize`) keeps
 * the exported text vertically aligned with the on-screen rendering.
 */
const createSvgText = (
	content: string,
	style: SvgTextStyle,
	box: TextLayoutBox,
	measureContext: CanvasRenderingContext2D,
): SVGTextElement => {
	const innerWidth = Math.max(0, box.width - box.insetX * 2);

	// The CSS font shorthand fixes the order style → weight → size → family; a
	// style after the weight makes the whole declaration invalid and the context
	// keeps its previous font.
	measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
	const measure = (text: string): number =>
		measureContext.measureText(text).width;

	// Real font metrics for the baseline. fontBoundingBox* is supported by all
	// modern browsers; the fallback approximates a typical Latin font.
	const sampleMetrics = measureContext.measureText("Mg");
	const ascent = sampleMetrics.fontBoundingBoxAscent ?? style.fontSize * 0.8;
	const descent = sampleMetrics.fontBoundingBoxDescent ?? style.fontSize * 0.2;
	// CSS centers the font's content box inside the line box (half-leading)
	const baselineInLine = (style.lineHeight - (ascent + descent)) / 2 + ascent;

	// Split into paragraphs at \n, then word-wrap each paragraph
	const lines = content
		.split("\n")
		.flatMap((paragraph) => wrapParagraph(paragraph, innerWidth, measure));

	// x: anchor reference position (left / center / right)
	const leftX = box.x + box.insetX;
	const centerX = box.x + box.width / 2;
	const rightX = box.x + box.width - box.insetX;
	const anchorX =
		style.anchor === "start"
			? leftX
			: style.anchor === "end"
				? rightX
				: centerX;

	// y: top of the text block according to the vertical placement. Flex
	// centers the overflowing block too (it spills equally on both sides),
	// so the middle case is intentionally not clamped at the padding edge.
	const blockHeight = lines.length * style.lineHeight;
	const blockTop =
		style.placement === "top"
			? box.y + box.insetY
			: style.placement === "bottom"
				? box.y + box.height - box.insetY - blockHeight
				: box.y + (box.height - blockHeight) / 2;

	const textElement = document.createElementNS(SVG_NS, "text");
	textElement.setAttribute("fill", style.fill);
	textElement.setAttribute("font-family", style.fontFamily);
	textElement.setAttribute("font-size", String(style.fontSize));
	textElement.setAttribute("font-weight", style.fontWeight);
	textElement.setAttribute("font-style", style.fontStyle);
	textElement.setAttribute("text-decoration", style.textDecoration);
	textElement.setAttribute("text-anchor", style.anchor);

	lines.forEach((line, index) => {
		const tspan = document.createElementNS(SVG_NS, "tspan");
		tspan.setAttribute("x", String(anchorX));
		tspan.setAttribute(
			"y",
			String(blockTop + index * style.lineHeight + baselineInLine),
		);
		// Zero-width space (U+200B) keeps empty lines from collapsing
		tspan.textContent = line === "" ? "\u200b" : line;
		textElement.appendChild(tspan);
	});

	return textElement;
};

/** The replacement group, carrying over the foreignObject's own transform. */
const createReplacementGroup = (
	geometry: ForeignObjectGeometry,
): SVGGElement => {
	const group = document.createElementNS(SVG_NS, "g") as SVGGElement;
	if (geometry.transform) {
		group.setAttribute("transform", geometry.transform);
	}
	return group;
};

/**
 * Measures the content of a foreignObject and returns a `<g>` (with the same
 * transform) wrapping the equivalent SVG `<text>`.
 *
 * Expects the TextOverlayFrame DOM contract (`foreignObject > wrapper >
 * content`): the wrapper supplies the vertical placement, the content element
 * the typography. Connector labels have their own shape and go through
 * connectorLabelToSvgGroup instead.
 *
 * @param liveForeignObject - foreignObject in the live DOM (for computed style and innerText)
 * @param clonedForeignObject - foreignObject in the clone (source of geometry attributes)
 * @param measureContext - Canvas 2D context used to measure text width
 * @returns The replacement `<g>` element, or null when there is no text to draw
 */
export const foreignObjectToSvgText = (
	liveForeignObject: Element,
	clonedForeignObject: Element,
	measureContext: CanvasRenderingContext2D,
): SVGGElement | null => {
	const wrapper = liveForeignObject.firstElementChild;
	const textDiv = wrapper?.firstElementChild;
	if (!wrapper || !textDiv) {
		return null;
	}

	const content = readRenderedText(textDiv);
	if (content === null) {
		return null;
	}

	const textStyle = getComputedStyle(textDiv);
	const style = readSvgTextStyle(
		textStyle,
		getComputedStyle(wrapper).alignItems,
	);
	const geometry = readForeignObjectGeometry(clonedForeignObject);

	const group = createReplacementGroup(geometry);
	group.appendChild(
		createSvgText(
			content,
			style,
			{
				...geometry,
				insetX: parsePxOr(textStyle.paddingLeft, 6),
				insetY: parsePxOr(textStyle.paddingTop, 2),
			},
			measureContext,
		),
	);
	return group;
};

/**
 * True for the foreignObject a connector label is drawn in (the attributes
 * ConnectorLabel.tsx puts on it).
 *
 * @param foreignObject - Any foreignObject of the canvas SVG (live or cloned)
 */
export const isConnectorLabelForeignObject = (
	foreignObject: Element,
): boolean =>
	foreignObject.getAttribute("data-kind") === "connector" &&
	foreignObject.getAttribute("data-part") === "label";

/**
 * Builds the `<rect>` standing in for the label box's background and border,
 * or null when neither paints anything.
 *
 * A CSS border is drawn inside the border box while an SVG stroke straddles
 * the path, so the rect is inset by half the border width (and its corner
 * radius shrinks by the same amount) to land on the same pixels.
 */
const createLabelBoxRect = (
	boxStyle: CSSStyleDeclaration,
	geometry: ForeignObjectGeometry,
): SVGRectElement | null => {
	const background = boxStyle.backgroundColor;
	const hasBackground = !isFullyTransparent(background);
	const borderWidth = parsePxOr(boxStyle.borderTopWidth, 0);
	const borderColor = boxStyle.borderTopColor;
	const hasBorder = borderWidth > 0 && !isFullyTransparent(borderColor);
	if (!hasBackground && !hasBorder) {
		return null;
	}

	const inset = hasBorder ? borderWidth / 2 : 0;
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("x", String(geometry.x + inset));
	rect.setAttribute("y", String(geometry.y + inset));
	rect.setAttribute("width", String(Math.max(0, geometry.width - inset * 2)));
	rect.setAttribute("height", String(Math.max(0, geometry.height - inset * 2)));

	const radius = parsePxOr(boxStyle.borderTopLeftRadius, 0);
	if (radius > 0) {
		rect.setAttribute("rx", String(Math.max(0, radius - inset)));
		rect.setAttribute("ry", String(Math.max(0, radius - inset)));
	}

	rect.setAttribute("fill", hasBackground ? background : "none");
	if (hasBorder) {
		rect.setAttribute("stroke", borderColor);
		rect.setAttribute("stroke-width", String(borderWidth));
		const dasharray = borderStyleToDasharray(
			boxStyle.borderTopStyle,
			borderWidth,
		);
		if (dasharray) {
			rect.setAttribute("stroke-dasharray", dasharray);
		}
	}
	return rect;
};

/**
 * Converts a connector label foreignObject into a `<g>` holding its box
 * `<rect>` (background + border) and its `<text>`.
 *
 * Unlike a text overlay the label is a single element (`foreignObject >
 * LabelBox`) that both paints the box and centers the text in it, so the
 * generic conversion cannot be used: it would find no content element, and it
 * draws no box.
 *
 * @param liveForeignObject - Label foreignObject in the live DOM (source of the
 *   computed box/text styles and of innerText)
 * @param clonedForeignObject - Its counterpart in the clone (source of the
 *   geometry attributes, which already carry label.position / label.offset)
 * @param measureContext - Canvas 2D context used to measure text width
 * @returns The replacement `<g>` element, or null when the label has no text
 */
export const connectorLabelToSvgGroup = (
	liveForeignObject: Element,
	clonedForeignObject: Element,
	measureContext: CanvasRenderingContext2D,
): SVGGElement | null => {
	const labelBox = liveForeignObject.firstElementChild;
	if (!labelBox) {
		return null;
	}

	const content = readRenderedText(labelBox);
	if (content === null) {
		return null;
	}

	const boxStyle = getComputedStyle(labelBox);
	const geometry = readForeignObjectGeometry(clonedForeignObject);

	const group = createReplacementGroup(geometry);
	const rect = createLabelBoxRect(boxStyle, geometry);
	if (rect) {
		group.appendChild(rect);
	}

	// The LabelBox centers its text with flex (align-items / justify-content),
	// which readSvgTextStyle reads as the "middle" placement: the block is
	// centered on the box, not offset from the padding edge.
	const borderWidth = parsePxOr(boxStyle.borderTopWidth, 0);
	group.appendChild(
		createSvgText(
			content,
			readSvgTextStyle(boxStyle, boxStyle.alignItems),
			{
				...geometry,
				insetX: parsePxOr(boxStyle.paddingLeft, 6) + borderWidth,
				insetY: parsePxOr(boxStyle.paddingTop, 2) + borderWidth,
			},
			measureContext,
		),
	);
	return group;
};
