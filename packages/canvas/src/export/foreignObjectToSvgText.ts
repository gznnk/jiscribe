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
 */

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

/**
 * Measures the content of a foreignObject and returns a `<g>` (with the same
 * transform) wrapping the equivalent SVG `<text>`.
 *
 * Baseline math follows the CSS inline layout model: each line box is
 * `line-height` tall, the font's content box (ascent + descent) is centered
 * in it by half-leading, and the baseline sits at
 * `halfLeading + ascent` from the line box top. Using the real font metrics
 * from TextMetrics (instead of an approximation like `0.8 * fontSize`) keeps
 * the exported text vertically aligned with the on-screen rendering.
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

	const content = (
		(textDiv as HTMLElement).innerText ??
		textDiv.textContent ??
		""
	).replace(/\u00a0/g, " ");
	if (content.trim() === "") {
		return null;
	}

	const textStyle = getComputedStyle(textDiv);
	const wrapperStyle = getComputedStyle(wrapper);

	const fontSize = parsePxOr(textStyle.fontSize, 16);
	const fontFamily = textStyle.fontFamily || "sans-serif";
	const fontWeight = textStyle.fontWeight || "normal";
	const fill = textStyle.color || "#000000";
	const lineHeight = parsePxOr(textStyle.lineHeight, fontSize * 1.5);
	const padX = parsePxOr(textStyle.paddingLeft, 6);
	const padY = parsePxOr(textStyle.paddingTop, 2);
	const anchor = toTextAnchor(textStyle.textAlign);
	const placement = toVerticalPlacement(wrapperStyle.alignItems);

	const boxX = parsePxOr(clonedForeignObject.getAttribute("x") ?? "0", 0);
	const boxY = parsePxOr(clonedForeignObject.getAttribute("y") ?? "0", 0);
	const boxWidth = parsePxOr(
		clonedForeignObject.getAttribute("width") ?? "0",
		0,
	);
	const boxHeight = parsePxOr(
		clonedForeignObject.getAttribute("height") ?? "0",
		0,
	);
	const transform = clonedForeignObject.getAttribute("transform");

	const innerWidth = Math.max(0, boxWidth - padX * 2);

	measureContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
	const measure = (text: string): number =>
		measureContext.measureText(text).width;

	// Real font metrics for the baseline. fontBoundingBox* is supported by all
	// modern browsers; the fallback approximates a typical Latin font.
	const sampleMetrics = measureContext.measureText("Mg");
	const ascent = sampleMetrics.fontBoundingBoxAscent ?? fontSize * 0.8;
	const descent = sampleMetrics.fontBoundingBoxDescent ?? fontSize * 0.2;
	// CSS centers the font's content box inside the line box (half-leading)
	const baselineInLine = (lineHeight - (ascent + descent)) / 2 + ascent;

	// Split into paragraphs at \n, then word-wrap each paragraph
	const lines = content
		.split("\n")
		.flatMap((paragraph) => wrapParagraph(paragraph, innerWidth, measure));

	// x: anchor reference position (left / center / right)
	const leftX = boxX + padX;
	const centerX = boxX + boxWidth / 2;
	const rightX = boxX + boxWidth - padX;
	const anchorX =
		anchor === "start" ? leftX : anchor === "end" ? rightX : centerX;

	// y: top of the text block according to the vertical placement. Flex
	// centers the overflowing block too (it spills equally on both sides),
	// so the middle case is intentionally not clamped at the padding edge.
	const blockHeight = lines.length * lineHeight;
	const blockTop =
		placement === "top"
			? boxY + padY
			: placement === "bottom"
				? boxY + boxHeight - padY - blockHeight
				: boxY + (boxHeight - blockHeight) / 2;

	const group = document.createElementNS(SVG_NS, "g") as SVGGElement;
	if (transform) {
		group.setAttribute("transform", transform);
	}

	const textElement = document.createElementNS(SVG_NS, "text");
	textElement.setAttribute("fill", fill);
	textElement.setAttribute("font-family", fontFamily);
	textElement.setAttribute("font-size", String(fontSize));
	textElement.setAttribute("font-weight", fontWeight);
	textElement.setAttribute("text-anchor", anchor);

	lines.forEach((line, index) => {
		const tspan = document.createElementNS(SVG_NS, "tspan");
		tspan.setAttribute("x", String(anchorX));
		tspan.setAttribute(
			"y",
			String(blockTop + index * lineHeight + baselineInLine),
		);
		// Zero-width space (U+200B) keeps empty lines from collapsing
		tspan.textContent = line === "" ? "\u200b" : line;
		textElement.appendChild(tspan);
	});

	group.appendChild(textElement);
	return group;
};
