// @vitest-environment jsdom

import { describe, it } from "vitest";

import type {
	InlineTextStyle,
	RichText,
} from "../../../../../schemas/objects/types/RichText";
import {
	isSameRichText,
	normalizeRichText,
	richTextToPlain,
} from "../../../../../schemas/objects/types/RichText";
import {
	hasUnexpectedMarkup,
	readEditableRichText,
	readEditableSelection,
	readEditableText,
	renderEditableRichText,
	setEditableSelection,
} from "../editableTextDom";

/**
 * Randomized round trips of the editable surface's DOM contract: any body drawn
 * must read back as its exact characters with no foreign markup, and any
 * selection put at UTF-16 offsets must read back at the same offsets. The
 * offsets are the seam every caret and styling operation goes through, so a
 * mapping error here is a "characters land at the wrong place" bug.
 *
 * A failure prints the seed and the body; rerun the seed alone to debug.
 * CI runs a fixed budget; raise TEXT_EDIT_FUZZ_RUNS locally to explore deeper.
 */
const RUNS = Number(process.env.TEXT_EDIT_FUZZ_RUNS ?? 300);

/** Deterministic PRNG (mulberry32), so a failing seed reproduces exactly. */
const createRandom = (seed: number): (() => number) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const randomInt = (random: () => number, maxExclusive: number): number =>
	Math.floor(random() * maxExclusive);

const pick = <T>(random: () => number, values: readonly T[]): T =>
	values[randomInt(random, values.length)];

const ALPHABET = "abcXY .\n";

const RUN_STYLES: readonly InlineTextStyle[] = [
	{},
	{ fontWeight: "bold" },
	{ fontStyle: "italic" },
	{ fontColor: "#123456" },
	{ fontSize: 24 },
	{ textDecoration: "underline" },
	{ fontWeight: "bold", fontSize: 12 },
];

/** A random body: a plain string, or runs mixing styles, newlines and empty pieces. */
const generateBody = (random: () => number): RichText => {
	const pieceCount = randomInt(random, 5);
	const pieces: string[] = [];
	for (let index = 0; index < pieceCount; index += 1) {
		let text = "";
		const length = randomInt(random, 6);
		for (let position = 0; position < length; position += 1) {
			text += pick(random, [...ALPHABET]);
		}
		pieces.push(text);
	}
	if (random() < 0.3) {
		return pieces.join("");
	}
	// Left un-normalized on purpose: the editor also draws bodies mid-edit, and
	// the read side must not depend on canonical form.
	return pieces.map((text) => ({ text, ...pick(random, RUN_STYLES) }));
};

const createSurface = (): HTMLDivElement => {
	const surface = document.createElement("div");
	surface.setAttribute("contenteditable", "true");
	document.body.replaceChildren(surface);
	return surface;
};

describe("editableTextDom fuzz", () => {
	it(
		"reads every drawn body back as its exact characters",
		{ timeout: 600_000 },
		() => {
			for (let seed = 1; seed <= RUNS; seed += 1) {
				const random = createRandom(seed);
				const body = generateBody(random);
				const surface = createSurface();
				renderEditableRichText(surface, body);

				const fail = (message: string): never => {
					throw new Error(
						`editableTextDom fuzz: ${message}\n seed: ${seed}\n body: ${JSON.stringify(body)}`,
					);
				};

				const plain = richTextToPlain(normalizeRichText(body));
				const read = readEditableText(surface);
				if (read !== plain) {
					fail(
						`read back ${JSON.stringify(read)} instead of ${JSON.stringify(plain)}`,
					);
				}
				if (hasUnexpectedMarkup(surface)) {
					fail("own rendering reads as unexpected markup");
				}
				const richRead = readEditableRichText(surface);
				if (!isSameRichText(richRead, body)) {
					fail(
						`styling read back as ${JSON.stringify(richRead)} instead of ${JSON.stringify(normalizeRichText(body))}`,
					);
				}
			}
		},
	);

	it(
		"puts and reads every selection at the same offsets",
		{ timeout: 600_000 },
		() => {
			for (let seed = 1; seed <= RUNS; seed += 1) {
				const random = createRandom(seed);
				const body = generateBody(random);
				const surface = createSurface();
				renderEditableRichText(surface, body);
				const plain = richTextToPlain(normalizeRichText(body));

				for (let round = 0; round < 5; round += 1) {
					const start = randomInt(random, plain.length + 1);
					const end = start + randomInt(random, plain.length - start + 1);
					setEditableSelection(surface, start, end);
					const selection = readEditableSelection(surface);

					if (
						selection === null ||
						selection.start !== start ||
						selection.end !== end ||
						selection.caretIndex !== end
					) {
						throw new Error(
							`editableTextDom fuzz: selection ${start}..${end} read back as ${JSON.stringify(selection)}\n seed: ${seed}\n body: ${JSON.stringify(body)}`,
						);
					}
				}
			}
		},
	);
});
