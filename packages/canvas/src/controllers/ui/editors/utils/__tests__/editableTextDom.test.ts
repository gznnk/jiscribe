// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { theme } from "../../../../../constants/theme";
import type { RichText } from "../../../../../schemas/objects/types/RichText";
import {
	focusEditableAtEnd,
	hasUnexpectedMarkup,
	readEditableRichText,
	readEditableSelection,
	readEditableText,
	renderEditableRichText,
	setEditableSelection,
} from "../editableTextDom";

/**
 * A fresh editable surface, attached to the document: a range only becomes the
 * document's selection while its root is that document, and only a connected
 * element takes the focus.
 */
const createSurface = (): HTMLDivElement => {
	const surface = document.createElement("div");
	surface.setAttribute("contenteditable", "true");
	document.body.replaceChildren(surface);
	return surface;
};

/** One element of the markup a browser leaves behind; a string child becomes a text node. */
const buildElement = (
	tagName: string,
	...children: (Node | string)[]
): HTMLElement => {
	const element = document.createElement(tagName);
	element.append(...children);
	return element;
};

/** A body drawn on a surface of its own and read straight back. */
const drawAndRead = (text: RichText): string => {
	const surface = createSurface();
	renderEditableRichText(surface, text);
	return readEditableText(surface);
};

describe("renderEditableRichText", () => {
	it("draws a plain body as a single text node, newlines and all", () => {
		const surface = createSurface();

		renderEditableRichText(surface, "ab\ncd");

		expect(surface.childNodes.length).toBe(1);
		expect(surface.firstChild?.nodeType).toBe(Node.TEXT_NODE);
		expect(surface.textContent).toBe("ab\ncd");
	});

	it("draws one marked span per run", () => {
		const surface = createSurface();

		renderEditableRichText(surface, [
			{ text: "ab", fontWeight: "bold" },
			{ text: "cd" },
		]);

		const spans = surface.querySelectorAll("span");
		expect(spans.length).toBe(2);
		expect(Array.from(spans, (span) => span.textContent)).toEqual(["ab", "cd"]);
		expect(spans[0].hasAttribute("data-run")).toBe(true);
		expect(spans[1].hasAttribute("data-run")).toBe(true);
	});

	it("puts only what a run overrides on its span", () => {
		const surface = createSurface();

		renderEditableRichText(surface, [
			{ text: "ab", fontWeight: "bold" },
			{
				text: "cd",
				fontColor: "#123456",
				fontSize: 24,
				fontFamily: "monospace",
				fontStyle: "italic",
				textDecoration: "underline",
			},
		]);

		const spans = surface.querySelectorAll("span");
		// The run set one field, so the span carries one declaration and nothing else.
		expect(spans[0].style.length).toBe(1);
		expect(spans[0].style.fontWeight).toBe("bold");
		expect(spans[1].style.length).toBe(5);
		// CSSOM gives a color back in its rgb() form.
		expect(spans[1].style.color).toBe("rgb(18, 52, 86)");
		expect(spans[1].style.fontSize).toBe("24px");
		expect(spans[1].style.fontFamily).toBe("monospace");
		expect(spans[1].style.fontStyle).toBe("italic");
		expect(spans[1].style.textDecoration).toBe("underline");
	});

	it("draws a run's auto color as the theme's ink, as the display side does", () => {
		const surface = createSurface();

		renderEditableRichText(surface, [{ text: "ab", fontColor: "auto" }]);

		expect(surface.querySelectorAll("span")[0].style.color).toBe(
			theme.objectInk,
		);
	});

	it("pads a body ending in a newline with a break, so its last line has a box", () => {
		const surface = createSurface();

		renderEditableRichText(surface, "ab\n");

		expect(surface.childNodes.length).toBe(2);
		expect(surface.lastChild?.nodeName).toBe("BR");
	});

	it("draws an empty body as a lone break, the line an empty editor is typed on", () => {
		const surface = createSurface();

		renderEditableRichText(surface, "");

		expect(surface.childNodes.length).toBe(1);
		expect(surface.firstChild?.nodeName).toBe("BR");
	});

	it("replaces whatever the surface was holding", () => {
		const surface = createSurface();

		renderEditableRichText(surface, [{ text: "ab", fontWeight: "bold" }]);
		renderEditableRichText(surface, "cd");

		expect(surface.querySelectorAll("span").length).toBe(0);
		expect(surface.textContent).toBe("cd");
	});
});

describe("readEditableText", () => {
	it("reads a body back exactly as it was drawn", () => {
		expect(drawAndRead("ab\ncd")).toBe("ab\ncd");
		expect(
			drawAndRead([{ text: "ab\n", fontWeight: "bold" }, { text: "cd" }]),
		).toBe("ab\ncd");
	});

	it("reads a body ending in a newline back without its padding break", () => {
		expect(drawAndRead("ab\n")).toBe("ab\n");
		expect(drawAndRead([{ text: "ab\n", fontSize: 24 }])).toBe("ab\n");
	});

	it("reads an empty body back as the empty text", () => {
		expect(drawAndRead("")).toBe("");
	});
});

describe("readEditableText on the markup Chrome leaves behind", () => {
	it("ends a line where the next block begins", () => {
		const surface = createSurface();

		// A multi-line insert, laid out as one block per line with the blank line
		// holding a placeholder break.
		surface.replaceChildren(
			buildElement("div", "a"),
			buildElement("div", buildElement("br")),
			buildElement("div", "b"),
		);

		expect(readEditableText(surface)).toBe("a\n\nb");
	});

	it("reads a leading blank block as a newline before the text", () => {
		const surface = createSurface();

		surface.replaceChildren(
			buildElement("div", buildElement("br")),
			buildElement("div", "a"),
		);

		expect(readEditableText(surface)).toBe("\na");
	});

	it("counts a break that ends a line inside its block", () => {
		const surface = createSurface();

		surface.replaceChildren(buildElement("div", "a", buildElement("br"), "b"));

		expect(readEditableText(surface)).toBe("a\nb");
	});

	it("counts a line ended by both a break and a block boundary once", () => {
		const surface = createSurface();

		surface.replaceChildren(
			buildElement("div", "a", buildElement("br")),
			buildElement("div", "b"),
		);

		expect(readEditableText(surface)).toBe("a\nb");
	});

	it("drops the padding newline Enter leaves inside a text node", () => {
		const surface = createSurface();

		// Enter at the end of "a" writes both the newline and the padding one as
		// characters of the same text node.
		surface.replaceChildren(document.createTextNode("a\n\n"));

		expect(readEditableText(surface)).toBe("a\n");
	});

	it("drops a trailing break as the padding it is", () => {
		const surface = createSurface();

		surface.replaceChildren(document.createTextNode("a"), buildElement("br"));

		expect(readEditableText(surface)).toBe("a");
	});
});

describe("readEditableRichText", () => {
	/** A span as the editor draws it, its run styling serialized on the marker. */
	const runSpan = (
		text: string,
		style: Record<string, unknown> = {},
	): HTMLElement => {
		const span = buildElement("span", text);
		span.setAttribute("data-run", JSON.stringify(style));
		return span;
	};

	it("round-trips what it drew, plain string form included", () => {
		const surface = createSurface();
		const body: RichText = [
			{ text: "ab", fontWeight: "bold" },
			{ text: "cd\ne" },
		];
		renderEditableRichText(surface, body);
		expect(readEditableRichText(surface)).toEqual(body);

		renderEditableRichText(surface, "plain\ntext");
		expect(readEditableRichText(surface)).toBe("plain\ntext");
	});

	it("reads the characters Chrome typed into a span as that span's run", () => {
		const surface = createSurface();
		// The browser extended the bold span with the typed "X".
		surface.replaceChildren(
			runSpan("abX", { fontWeight: "bold" }),
			runSpan("cd"),
		);

		expect(readEditableRichText(surface)).toEqual([
			{ text: "abX", fontWeight: "bold" },
			{ text: "cd" },
		]);
	});

	it("reads a character typed outside every span as unstyled", () => {
		const surface = createSurface();
		surface.replaceChildren(
			runSpan("ab", { fontWeight: "bold" }),
			document.createTextNode("X"),
		);

		expect(readEditableRichText(surface)).toEqual([
			{ text: "ab", fontWeight: "bold" },
			{ text: "X" },
		]);
	});

	it("keeps the styling of a span Chrome cloned into a block per line", () => {
		const surface = createSurface();
		surface.replaceChildren(
			buildElement("div", runSpan("a", { fontColor: "#d33" })),
			buildElement("div", runSpan("b", { fontColor: "#d33" })),
		);

		expect(readEditableRichText(surface)).toEqual([
			{ text: "a", fontColor: "#d33" },
			{ text: "\n" },
			{ text: "b", fontColor: "#d33" },
		]);
	});

	it("reads text inside foreign markup as unstyled", () => {
		const surface = createSurface();
		// The <b> Chrome revives a deleted run's typing style with carries no run
		// marker, so its styling is not the runs' and does not survive the read.
		surface.replaceChildren(
			document.createTextNode("a"),
			buildElement("b", "X"),
		);

		expect(readEditableRichText(surface)).toBe("aX");
	});

	it("reads an unparseable run marker as unstyled instead of failing", () => {
		const surface = createSurface();
		const legacy = buildElement("span", "ab");
		legacy.setAttribute("data-run", "");
		surface.replaceChildren(legacy);

		expect(readEditableRichText(surface)).toBe("ab");
	});

	it("drops the trailing padding, whichever form it took", () => {
		const surface = createSurface();
		surface.replaceChildren(
			runSpan("ab\n", { fontWeight: "bold" }),
			buildElement("br"),
		);
		expect(readEditableRichText(surface)).toEqual([
			{ text: "ab\n", fontWeight: "bold" },
		]);

		surface.replaceChildren(document.createTextNode("a\n\n"));
		expect(readEditableRichText(surface)).toBe("a\n");
	});
});

describe("hasUnexpectedMarkup", () => {
	it("passes the content the editor draws itself", () => {
		const surface = createSurface();

		renderEditableRichText(surface, [
			{ text: "ab\n", fontWeight: "bold" },
			{ text: "cd" },
		]);

		expect(hasUnexpectedMarkup(surface)).toBe(false);
	});

	it("passes an empty body, drawn as the padding break alone", () => {
		const surface = createSurface();

		renderEditableRichText(surface, "");

		expect(hasUnexpectedMarkup(surface)).toBe(false);
	});

	it("passes a span Chrome cloned from an editor-built one", () => {
		const surface = createSurface();
		// A run split across a line keeps the marker along with the styling.
		const clonedRunSpan = buildElement("span", "ab");
		clonedRunSpan.setAttribute("data-run", "");
		clonedRunSpan.style.fontWeight = "bold";

		surface.replaceChildren(clonedRunSpan);

		expect(hasUnexpectedMarkup(surface)).toBe(false);
	});

	it("flags the elements the browser's own bold writes", () => {
		const surface = createSurface();

		surface.replaceChildren("a", buildElement("b", "bold"));
		expect(hasUnexpectedMarkup(surface)).toBe(true);

		surface.replaceChildren("a", buildElement("font", "colored"));
		expect(hasUnexpectedMarkup(surface)).toBe(true);
	});

	it("flags a styled span the editor did not mark as a run", () => {
		const surface = createSurface();
		// Chrome revives a deleted run's size override as a bare span, which only
		// the missing marker tells from an editor-built one.
		const revivedSpan = buildElement("span", "ab");
		revivedSpan.style.fontSize = "24px";

		surface.replaceChildren(revivedSpan);

		expect(hasUnexpectedMarkup(surface)).toBe(true);
	});

	it("flags the block Chrome makes of a line", () => {
		const surface = createSurface();

		surface.replaceChildren(buildElement("div", "a"), buildElement("div", "b"));

		expect(hasUnexpectedMarkup(surface)).toBe(true);
	});
});

describe("readEditableSelection / setEditableSelection", () => {
	it("reads back every offset of a styled body it was set to", () => {
		const surface = createSurface();
		renderEditableRichText(surface, [
			{ text: "ab\n", fontWeight: "bold" },
			{ text: "cd" },
		]);

		for (let offset = 0; offset <= "ab\ncd".length; offset += 1) {
			setEditableSelection(surface, offset, offset);

			expect(readEditableSelection(surface)).toEqual({
				start: offset,
				end: offset,
				caretIndex: offset,
			});
		}
	});

	it("reads back an offset on the empty last line of a body ending in a newline", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\n");

		setEditableSelection(surface, 3, 3);

		expect(readEditableSelection(surface)).toEqual({
			start: 3,
			end: 3,
			caretIndex: 3,
		});
	});

	it("reads back a range as its two ends, the caret on the end it grew to", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");

		setEditableSelection(surface, 1, 4);

		expect(readEditableSelection(surface)).toEqual({
			start: 1,
			end: 4,
			caretIndex: 4,
		});
	});

	it("reads a selection extended backwards with its caret at the start", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");
		const textNode = surface.firstChild as Text;

		// Selected from offset 4 back to 1, which is where the caret is drawn.
		document.getSelection()?.setBaseAndExtent(textNode, 4, textNode, 1);

		expect(readEditableSelection(surface)).toEqual({
			start: 1,
			end: 4,
			caretIndex: 1,
		});
	});

	it("clamps a selection set past the end of the text", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");

		setEditableSelection(surface, 99, 99);

		expect(readEditableSelection(surface)).toEqual({
			start: 5,
			end: 5,
			caretIndex: 5,
		});
	});

	it("clamps a negative start to the start of the text", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");

		setEditableSelection(surface, -3, 2);

		expect(readEditableSelection(surface)).toEqual({
			start: 0,
			end: 2,
			caretIndex: 2,
		});
	});

	it("collapses a selection whose end lies before its start", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");

		setEditableSelection(surface, 4, 2);

		expect(readEditableSelection(surface)).toEqual({
			start: 4,
			end: 4,
			caretIndex: 4,
		});
	});

	it("puts a caret in an empty body at its only offset", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "");

		setEditableSelection(surface, 0, 0);

		expect(readEditableSelection(surface)).toEqual({
			start: 0,
			end: 0,
			caretIndex: 0,
		});
	});

	it("reads no selection while another element holds it", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");
		const other = buildElement("div", "elsewhere");
		document.body.append(other);

		const otherText = other.firstChild as Text;
		document.getSelection()?.setBaseAndExtent(otherText, 0, otherText, 4);

		expect(readEditableSelection(surface)).toBeNull();
	});

	it("reads no selection while nothing is selected", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");

		document.getSelection()?.removeAllRanges();

		expect(readEditableSelection(surface)).toBeNull();
	});
});

describe("focusEditableAtEnd", () => {
	it("takes the focus for the surface", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");

		focusEditableAtEnd(surface);

		expect(document.activeElement).toBe(surface);
	});

	it("puts the caret at the end of the text", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\ncd");
		// jsdom collapses the selection onto an element that newly takes the focus,
		// which a browser does not do to a selection already inside it. Focusing
		// first leaves the focus change out of what this checks.
		surface.focus();

		focusEditableAtEnd(surface);

		expect(readEditableSelection(surface)).toEqual({
			start: 5,
			end: 5,
			caretIndex: 5,
		});
	});

	it("puts the caret on the empty last line of a body ending in a newline", () => {
		const surface = createSurface();
		renderEditableRichText(surface, "ab\n");
		surface.focus();

		focusEditableAtEnd(surface);

		expect(readEditableSelection(surface)).toEqual({
			start: 3,
			end: 3,
			caretIndex: 3,
		});
	});
});
