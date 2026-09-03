import { isObject } from "@jiscribe/basic-validators";
import type {
	InlineTextStyle,
	RichText,
	TextRun,
} from "@jiscribe/doc/model/objects/types/RichText";
import {
	hasValidInlineTextStyle,
	normalizeRichText,
	pickDefinedInlineTextStyle,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/RichText";

import { resolveAutoColor } from "../../../../rendering/objects/utils/resolveAutoColor";

/**
 * The DOM contract of the shape text editor's editable surface: how a body of
 * text is drawn into a `contenteditable` div, how the div reads back as the plain
 * text the editing state holds, and how the two address the same offsets.
 *
 * The surface is edited in place by the browser, so everything here has to survive
 * what Chrome leaves behind rather than assume the shape this module builds.
 */

/**
 * Marks the spans this module draws a run with, and carries the run's own
 * styling fields as JSON. The marker is what tells an editor-built span from the
 * `<span style="font-size: 24px">` Chrome revives a deleted run's typing style
 * with; the JSON is what {@link readEditableRichText} reads the styling back
 * from, exactly as it was authored — the inline `style` cannot serve, because it
 * holds resolved values (an "auto" color is drawn as the theme ink).
 */
const RUN_ATTRIBUTE_NAME = "data-run";

/**
 * Elements that lay out as a line of their own, so the text before them ends a
 * line. Chrome inserts one per line when several lines are inserted at once
 * (`insertText` with a newline in it, which a paste goes through).
 */
const LINE_BLOCK_TAG_NAMES = new Set(["DIV", "P"]);

/**
 * One piece of the surface's text in document order: a text node's characters, or
 * the single "\n" a line break stands for.
 */
type EditableTextUnit = {
	/** The node the piece comes from: the text node itself, or the `<br>` / block element the "\n" stands for. */
	node: Node;
	/** Which of the two the piece is; a "break" contributes one "\n" and holds no characters of its own. */
	kind: "text" | "break";
	/** Offset of the piece's first code unit in the raw serialization. */
	start: number;
	/** Code units the piece contributes: the text node's length (possibly 0), or 1 for a break. */
	length: number;
};

/** Copies a run's overrides onto the span drawing it; kept in step with RichTextContent's TextRunSpan, which draws the same run on the display side. */
const applyRunStyle = (span: HTMLElement, run: TextRun): void => {
	if (run.fontColor !== undefined) {
		// The same resolver as the display side, so "auto" follows the theme here
		// too (issue #38).
		span.style.color = resolveAutoColor(run.fontColor, "ink");
	}
	if (run.fontSize !== undefined) {
		span.style.fontSize = `${run.fontSize}px`;
	}
	if (run.fontFamily !== undefined) {
		span.style.fontFamily = run.fontFamily;
	}
	if (run.fontWeight !== undefined) {
		span.style.fontWeight = run.fontWeight;
	}
	if (run.fontStyle !== undefined) {
		span.style.fontStyle = run.fontStyle;
	}
	if (run.textDecoration !== undefined) {
		span.style.textDecoration = run.textDecoration;
	}
};

/**
 * Draws a body of text into the editable surface, replacing whatever it held.
 *
 * The plain form becomes a single text node (`white-space: pre-wrap` draws its
 * newlines), the run form one `<span>` per run carrying only what that run
 * overrides — the same DOM the display overlay builds, so the two draw one body
 * identically, plus the marker {@link hasUnexpectedMarkup} tells these spans by.
 *
 * A body whose last line is empty gets a trailing `<br>`: the line break that ends
 * the text has no line box of its own, and without one the caret cannot be put on
 * that last line at all. Chrome keeps the same padding on its own while editing,
 * which is why {@link readEditableText} drops one trailing break again.
 *
 * @param surface - The editable div; its children are replaced wholesale, so any
 *   selection inside it is lost and the caller has to restore it
 * @param text - The body to draw; "" draws the `<br>` alone, which is what gives an
 *   empty editor a line to type on
 */
export const renderEditableRichText = (
	surface: HTMLElement,
	text: RichText,
): void => {
	const ownerDocument = surface.ownerDocument;
	const children: Node[] = [];
	if (typeof text === "string") {
		if (text !== "") {
			children.push(ownerDocument.createTextNode(text));
		}
	} else {
		for (const run of text) {
			const span = ownerDocument.createElement("span");
			span.setAttribute(
				RUN_ATTRIBUTE_NAME,
				JSON.stringify(pickDefinedInlineTextStyle(run)),
			);
			applyRunStyle(span, run);
			span.textContent = run.text;
			children.push(span);
		}
	}
	const plain = richTextToPlain(text);
	if (plain === "" || plain.endsWith("\n")) {
		children.push(ownerDocument.createElement("br"));
	}
	surface.replaceChildren(...children);
};

/**
 * Whether a `<br>` only gives its line a box instead of ending a line of its own.
 * Chrome puts one in every empty line it lays out as a block (`<div><br></div>`
 * per blank line of a multi-line insert), and there the next block's boundary is
 * what ends the line — counting the `<br>` as well would read one blank line as
 * two. Nothing follows the last line, so the `<br>` ending it is the padding break
 * {@link readUnits} drops again and stays a break here.
 */
const isLinePlaceholderBreak = (surface: HTMLElement, br: Node): boolean => {
	// The next node that starts a line, looked for past the end of every block the
	// `<br>` sits at the end of.
	let node: Node = br;
	while (node !== surface) {
		const next = node.nextSibling;
		if (next !== null) {
			return (
				next.nodeType === Node.ELEMENT_NODE &&
				LINE_BLOCK_TAG_NAMES.has((next as Element).tagName)
			);
		}
		const parent = node.parentNode;
		if (parent === null) {
			return false;
		}
		node = parent;
	}
	return false;
};

/** Walks the surface into its text pieces, in the order they are drawn. */
const collectUnits = (surface: HTMLElement): EditableTextUnit[] => {
	const units: EditableTextUnit[] = [];
	let offset = 0;
	// Whether a line has already been walked, which a block that opens after it
	// ends. Not `units.length > 0`: an empty first block contributes no piece at
	// all, and the block after it would then be read as the first one.
	let hasPrecedingLine = false;
	// Indexed rather than iterated: the VSCode extension compiles this file without
	// the DOM.Iterable lib, where a NodeList is array-like but not iterable.
	const visit = (parent: Node): void => {
		for (let index = 0; index < parent.childNodes.length; index += 1) {
			const child = parent.childNodes[index];
			if (child.nodeType === Node.TEXT_NODE) {
				const { length } = (child as Text).data;
				// Empty text nodes are kept: they carry no characters, but the browser
				// does leave the caret in one, and that position still has to map.
				units.push({ node: child, kind: "text", start: offset, length });
				offset += length;
				hasPrecedingLine = true;
				continue;
			}
			if (child.nodeType !== Node.ELEMENT_NODE) {
				continue;
			}
			const { tagName } = child as Element;
			if (tagName === "BR") {
				hasPrecedingLine = true;
				if (isLinePlaceholderBreak(surface, child)) {
					continue;
				}
				units.push({ node: child, kind: "break", start: offset, length: 1 });
				offset += 1;
				continue;
			}
			// A block that opens after a line was already drawn ends that line; the
			// first line in the surface starts no new one.
			if (LINE_BLOCK_TAG_NAMES.has(tagName)) {
				if (hasPrecedingLine) {
					units.push({ node: child, kind: "break", start: offset, length: 1 });
					offset += 1;
				}
				hasPrecedingLine = true;
			}
			visit(child);
		}
	};
	visit(surface);
	return units;
};

/** The characters of every piece, the padding break at the end included. */
const serializeUnits = (units: readonly EditableTextUnit[]): string =>
	units
		.map((unit) => (unit.kind === "text" ? (unit.node as Text).data : "\n"))
		.join("");

/** The surface read once, for the callers that need the offsets as well as the text. */
const readUnits = (
	surface: HTMLElement,
): { units: EditableTextUnit[]; plain: string } => {
	const units = collectUnits(surface);
	const raw = serializeUnits(units);
	// A text ending in a line break needs one more break behind it, or its empty
	// last line has no line box and the caret cannot be put on it. This module
	// draws that padding (see renderEditableRichText) and Chrome maintains it
	// through its own edits — as a `<br>` after a delete, as one more "\n" after
	// an Enter — so the final break is the padding rather than a character of the
	// text, whichever of the two forms it took.
	return { units, plain: raw.endsWith("\n") ? raw.slice(0, -1) : raw };
};

/**
 * The text the surface currently holds, in the UTF-16 code units the editing state
 * and the selection offsets count in.
 *
 * @param surface - The editable div, in whatever shape the browser left it: text
 *   nodes, `<br>`, `<span>`, and the `<div>` per line Chrome makes of a multi-line
 *   insert are all read
 * @returns The plain text, with the trailing padding break dropped
 */
export const readEditableText = (surface: HTMLElement): string =>
	readUnits(surface).plain;

/**
 * The styling a piece of the surface's text is drawn with: the fields carried by
 * the run span it sits inside, or nothing for text outside every span. An
 * unreadable attribute (foreign markup renamed by an extension, a legacy empty
 * marker) reads as unstyled rather than failing the read.
 */
const readRunStyle = (surface: HTMLElement, node: Node): InlineTextStyle => {
	let element: Element | null =
		node.nodeType === Node.ELEMENT_NODE
			? (node as Element)
			: node.parentElement;
	while (element !== null && element !== surface) {
		const serialized = element.getAttribute(RUN_ATTRIBUTE_NAME);
		if (serialized !== null) {
			try {
				const parsed: unknown = JSON.parse(serialized);
				if (isObject(parsed) && hasValidInlineTextStyle(parsed)) {
					return pickDefinedInlineTextStyle(parsed);
				}
			} catch {
				// Fall through to unstyled.
			}
			return {};
		}
		element = element.parentElement;
	}
	return {};
};

/**
 * The body the surface currently holds, styling included: the characters of
 * {@link readEditableText}, each carrying the fields of the run span it is drawn
 * inside. This is what makes the browser's own edits the source of truth — a
 * character Chrome put into a span reads back styled, one it put outside reads
 * back unstyled, so what the editing state holds is exactly what is on screen,
 * whichever way Chrome resolved the edit.
 *
 * @param surface - The editable div, in whatever shape the browser left it
 * @returns The body in canonical form, a plain string when nothing is styled
 */
export const readEditableRichText = (surface: HTMLElement): RichText => {
	const units = collectUnits(surface);
	const runs: TextRun[] = [];
	for (const unit of units) {
		const text = unit.kind === "text" ? (unit.node as Text).data : "\n";
		if (text === "") {
			continue;
		}
		runs.push({ text, ...readRunStyle(surface, unit.node) });
	}
	// The trailing padding break is not a character of the text (see readUnits).
	const last = runs[runs.length - 1];
	if (last !== undefined && last.text.endsWith("\n")) {
		if (last.text.length === 1) {
			runs.pop();
		} else {
			runs[runs.length - 1] = { ...last, text: last.text.slice(0, -1) };
		}
	}
	return normalizeRichText(runs);
};

/**
 * Whether the surface holds an element the editor never built — one of the
 * `<b>` / `<font>` / `<span style>` Chrome revives a deleted run's typing style
 * with, or the `<div>` per line it makes of a multi-line insert. The characters
 * still read back correctly, but the drawn styling is no longer the one the runs
 * describe, so the caller rebuilds.
 *
 * A span Chrome clones from an editor-built one (splitting a run across the block
 * it makes of a line) keeps its attributes and so passes; what flags such an edit
 * is the `<div>` the clone was moved into.
 *
 * @param surface - The editable div
 * @returns True when any descendant element is neither a `<br>` nor a span this
 *   module drew a run with
 */
export const hasUnexpectedMarkup = (surface: HTMLElement): boolean =>
	Array.from(surface.querySelectorAll("*")).some(
		(element) =>
			element.tagName !== "BR" &&
			!(element.tagName === "SPAN" && element.hasAttribute(RUN_ATTRIBUTE_NAME)),
	);

/** What the surface has selected, in the offsets of {@link readEditableText}. */
export type EditableSelection = {
	/** First selected offset; never greater than `end`, as with a textarea. */
	start: number;
	/** First offset past the selection; equal to `start` for a plain caret. */
	end: number;
	/** The end the caret is drawn at: the moving end of the selection, i.e. `start` when it was extended backwards. */
	caretIndex: number;
};

/** Offset of a DOM position, mapped to the first piece that starts at or after it. */
const toPlainOffset = (
	surface: HTMLElement,
	units: readonly EditableTextUnit[],
	plainLength: number,
	node: Node,
	offset: number,
): number => {
	if (node.nodeType === Node.TEXT_NODE) {
		const unit = units.find((candidate) => candidate.node === node);
		if (unit) {
			return Math.min(unit.start + offset, plainLength);
		}
		return plainLength;
	}
	// A position in a container sits before its child at `offset`, so the piece it
	// addresses is the first one that does not start before it.
	const position = surface.ownerDocument.createRange();
	position.setStart(node, offset);
	for (const unit of units) {
		if (position.comparePoint(unit.node, 0) >= 0) {
			return Math.min(unit.start, plainLength);
		}
	}
	return plainLength;
};

/**
 * What the surface has selected, provided the selection is inside it.
 *
 * @param surface - The editable div; a selection outside it (another element has
 *   the focus, or nothing is selected) reads as null rather than as offset 0
 * @returns The selected range, or null when the surface holds no selection
 */
export const readEditableSelection = (
	surface: HTMLElement,
): EditableSelection | null => {
	const selection = surface.ownerDocument.getSelection();
	const { anchorNode, focusNode } = selection ?? {};
	if (!selection || !anchorNode || !focusNode) {
		return null;
	}
	if (!surface.contains(anchorNode) || !surface.contains(focusNode)) {
		return null;
	}
	const { units, plain } = readUnits(surface);
	const anchor = toPlainOffset(
		surface,
		units,
		plain.length,
		anchorNode,
		selection.anchorOffset,
	);
	const focus = toPlainOffset(
		surface,
		units,
		plain.length,
		focusNode,
		selection.focusOffset,
	);
	return {
		start: Math.min(anchor, focus),
		end: Math.max(anchor, focus),
		caretIndex: focus,
	};
};

/** DOM position an offset addresses: inside the piece holding it, or before the break standing at it. */
const toDomPosition = (
	units: readonly EditableTextUnit[],
	surface: HTMLElement,
	offset: number,
): { node: Node; offset: number } => {
	for (const unit of units) {
		if (offset < unit.start + unit.length) {
			if (unit.kind === "text") {
				return { node: unit.node, offset: offset - unit.start };
			}
			const parent = unit.node.parentNode ?? surface;
			return {
				node: parent,
				offset: Array.prototype.indexOf.call(parent.childNodes, unit.node),
			};
		}
	}
	// Past every piece: the end of the last text node, or the surface itself when
	// it holds none (an empty body, drawn as the padding break alone).
	for (let index = units.length - 1; index >= 0; index -= 1) {
		const unit = units[index];
		if (unit.kind === "text") {
			return { node: unit.node, offset: (unit.node as Text).data.length };
		}
	}
	return { node: surface, offset: surface.childNodes.length };
};

/**
 * Selects a range of the surface's text, the operation {@link readEditableSelection}
 * reads back. Used to restore what was selected after the surface is rebuilt, and
 * to put the caret at the end when editing starts.
 *
 * @param surface - The editable div; the document's selection is moved into it, so
 *   the focus is either already on it or taken right after (focusEditableAtEnd)
 * @param start - First selected offset; clamped to the text
 * @param end - First offset past the selection; equal to `start` collapses the
 *   selection into a caret, and a value below `start` is clamped up to it
 */
export const setEditableSelection = (
	surface: HTMLElement,
	start: number,
	end: number,
): void => {
	const { units, plain } = readUnits(surface);
	const from = Math.min(Math.max(start, 0), plain.length);
	const to = Math.min(Math.max(end, from), plain.length);
	const range = surface.ownerDocument.createRange();
	const startPosition = toDomPosition(units, surface, from);
	const endPosition = toDomPosition(units, surface, to);
	range.setStart(startPosition.node, startPosition.offset);
	range.setEnd(endPosition.node, endPosition.offset);
	const selection = surface.ownerDocument.getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
};

/**
 * Puts the caret at the end of the surface's text and takes the focus, the state
 * an in-place editor opens in.
 *
 * @param surface - The editable div, already holding its text (the caret is placed
 *   before the focus, so the reveal that rides on the focus event already sees the
 *   end of the text)
 */
export const focusEditableAtEnd = (surface: HTMLElement): void => {
	const length = readEditableText(surface).length;
	setEditableSelection(surface, length, length);
	// preventScroll: the browser would otherwise reveal the surface by scrolling
	// the overflow-hidden ancestors, an offset the canvas camera knows nothing
	// about. Revealing is useRevealTextEditCaret's job.
	surface.focus({ preventScroll: true });
};
