import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import type {
	RichText,
	TextRun,
} from "../../../../schemas/objects/types/RichText";
import { richTextToPlain } from "../../../../schemas/objects/types/RichText";

/**
 * The DOM contract of the shape text editor's editable surface: how a body of
 * text is drawn into a `contenteditable` div, how the div reads back as the plain
 * text the editing state holds, and how the two address the same offsets.
 *
 * The surface is edited in place by the browser, so everything here has to survive
 * what Chrome leaves behind rather than assume the shape this module builds.
 */

/** Elements the editor builds itself; anything else in the surface came from the browser. */
const BUILT_TAG_NAMES = new Set(["SPAN", "BR"]);

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
 * identically.
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

/** Walks the surface into its text pieces, in the order they are drawn. */
const collectUnits = (surface: HTMLElement): EditableTextUnit[] => {
	const units: EditableTextUnit[] = [];
	let offset = 0;
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
				continue;
			}
			if (child.nodeType !== Node.ELEMENT_NODE) {
				continue;
			}
			const { tagName } = child as Element;
			if (tagName === "BR") {
				units.push({ node: child, kind: "break", start: offset, length: 1 });
				offset += 1;
				continue;
			}
			// A block that opens after something else was already drawn ends that
			// line; the first block in the surface starts no new line.
			if (LINE_BLOCK_TAG_NAMES.has(tagName) && units.length > 0) {
				units.push({ node: child, kind: "break", start: offset, length: 1 });
				offset += 1;
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
 * Whether the surface holds an element the editor never builds — a `<b>` Chrome
 * revives a deleted run's typing style with, or the `<div>` per line it makes of a
 * multi-line insert. The characters still read back correctly, but the drawn
 * styling is no longer the one the runs describe, so the caller rebuilds.
 *
 * @param surface - The editable div
 * @returns True when any descendant element is neither a `<span>` nor a `<br>`
 */
export const hasUnexpectedMarkup = (surface: HTMLElement): boolean =>
	Array.from(surface.querySelectorAll("*")).some(
		(element) => !BUILT_TAG_NAMES.has(element.tagName),
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
 * @param surface - The editable div; the document's selection is moved into it,
 *   so this is only called while it has the focus
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
