import { TEXT_BOX_PADDING_X, TEXT_BOX_PADDING_Y } from "@jiscribe/doc/unstable";
import type { Rect } from "@jiscribe/geometry";
import { describe, it, expect } from "vitest";

import type { ContentBoxShape } from "../resolveContentBox";
import { resolveContentBox } from "../resolveContentBox";

/** The rectangle of a `region` answer, null for the two answers that have none. */
const contentRectOf = (shape: ContentBoxShape): Rect | null => {
	const resolution = resolveContentBox(shape);
	return resolution.kind === "region" ? resolution.rect : null;
};

/**
 * The content-inset table this package used to keep, kept here as the expected
 * values of every shipped type's content box. It was a restatement, in numbers,
 * of what each shape's `textRegion` calculator produced; `resolveContentBox` now asks
 * the type's own declaration (`ObjectDocDefinition.textRegion`) instead, and this
 * suite is what pins the answer to what the table said — the migration's
 * before/after, kept as the regression test of the declarations.
 *
 * Where the declaration deliberately answers something the table could not, the
 * new answer is pinned in the second describe block rather than here.
 */
type ContentInset = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

type ContentInsetCalculator = (
	width: number,
	height: number,
) => ContentInset | null;

const NO_INSET: ContentInset = { left: 0, right: 0, top: 0, bottom: 0 };

/** Text laid out beyond the outline, so the box never constrains it. */
const outsideTheBox: ContentInsetCalculator = () => null;

/** An inset given as a fraction of the box's own width and height. */
const byRatio =
	(ratios: Partial<ContentInset>): ContentInsetCalculator =>
	(width, height) => ({
		left: (ratios.left ?? 0) * width,
		right: (ratios.right ?? 0) * width,
		top: (ratios.top ?? 0) * height,
		bottom: (ratios.bottom ?? 0) * height,
	});

/** Text laid out over the whole box (what an absent table entry meant). */
const wholeBox: ContentInsetCalculator = () => NO_INSET;

/** Header band a container draws its title in (ContainerDoc: CONTAINER_HEADER_HEIGHT). */
const CONTAINER_HEADER_HEIGHT = 28;

/** Corner the fold of a `card` / `loopLimit` cuts off (CardDoc: CARD_CUT_RATIO). */
const CORNER_CUT_RATIO = 0.25;

const LEGACY_INSET_BY_TYPE: Readonly<Record<string, ContentInsetCalculator>> = {
	rect: wholeBox,
	text: wholeBox,
	ellipse: byRatio({
		left: (1 - 1 / Math.SQRT2) / 2,
		right: (1 - 1 / Math.SQRT2) / 2,
		top: (1 - 1 / Math.SQRT2) / 2,
		bottom: (1 - 1 / Math.SQRT2) / 2,
	}),

	// plugins/flowchart-shapes
	card: (width, height) => ({
		...NO_INSET,
		top: Math.min(width, height) * CORNER_CUT_RATIO,
	}),
	cross: outsideTheBox,
	db: byRatio({ top: 0.24, bottom: 0.12 }),
	delay: (_width, height) => ({ ...NO_INSET, right: height / 2 }),
	diamond: byRatio({ left: 0.25, right: 0.25, top: 0.25, bottom: 0.25 }),
	display: byRatio({ left: 0.15, right: 0.18 }),
	document: byRatio({ bottom: 0.15 }),
	extract: outsideTheBox,
	hexagon: byRatio({ left: 0.2, right: 0.2 }),
	loopLimit: (width, height) => ({
		...NO_INSET,
		top: Math.min(width, height) * CORNER_CUT_RATIO,
	}),
	manualInput: byRatio({ top: 0.25 }),
	multiDocument: (width, height) => {
		const offset = Math.min(width, height) * 0.08;
		return {
			left: 0,
			right: 2 * offset,
			top: 2 * offset,
			bottom: (height - 2 * offset) * 0.15,
		};
	},
	offPageConnector: byRatio({ bottom: 0.3 }),
	parallelogram: byRatio({ left: 0.22, right: 0.22 }),
	stadium: (width, height) => {
		const capRadius = Math.min(width, height) / 2;
		return width >= height
			? { left: capRadius, right: capRadius, top: 0, bottom: 0 }
			: { left: 0, right: 0, top: capRadius, bottom: capRadius };
	},
	storedData: byRatio({ left: 0.125, right: 0.125 }),
	subroutine: byRatio({ left: 0.12, right: 0.12 }),
	trapezoid: byRatio({ left: 0.2, right: 0.2 }),

	// plugins/general-shapes
	actor: outsideTheBox,
	envelope: outsideTheBox,
	gear: outsideTheBox,
	lock: outsideTheBox,
	package: outsideTheBox,
	queue: outsideTheBox,
	server: outsideTheBox,
	cloud: byRatio({ left: 0.15, right: 0.15, top: 0.2, bottom: 0.2 }),
	browserWindow: byRatio({ left: 0.06, right: 0.06, top: 0.3, bottom: 0.06 }),
	terminalWindow: byRatio({ left: 0.06, right: 0.06, top: 0.3, bottom: 0.06 }),
	folder: byRatio({ left: 0.06, right: 0.06, top: 0.24, bottom: 0.06 }),
	file: (width, height) => ({
		left: 0.06 * width,
		right: 0.06 * width,
		top: Math.min(width * 0.3, height * 0.28) + 0.06 * height,
		bottom: 0.06 * height,
	}),
	shield: byRatio({ left: 0.07, right: 0.07, top: 0.07, bottom: 0.55 }),
	smartphone: byRatio({ left: 0.14, right: 0.14, top: 0.13, bottom: 0.15 }),
	laptop: byRatio({ left: 0.17, right: 0.17, top: 0.05, bottom: 0.33 }),

	// plugins/annotation-shapes
	brace: outsideTheBox,
	bracket: outsideTheBox,
	bracketWithStem: outsideTheBox,
	callout: byRatio({ bottom: 0.25 }),
	note: (width, height) => ({
		...NO_INSET,
		right: Math.min(width, height) * 0.2,
	}),

	// plugins/container-shapes
	container: (_width, height) => ({
		...NO_INSET,
		bottom: height - Math.min(CONTAINER_HEADER_HEIGHT, height),
	}),

	// plugins/uml-shapes
	record: outsideTheBox,
	umlComponent: wholeBox,
	umlPackage: (_width, height) => ({
		...NO_INSET,
		top: Math.max(0, Math.min(16, height * 0.25)),
	}),

	// plugins/lucide-icon-shape
	lucideIcon: outsideTheBox,

	// plugins/sticky-shape, plugins/markdown-shape
	sticky: wholeBox,
	markdown: wholeBox,
};

/** What the table produced for one type at one size, padding included. */
const legacyContentBox = (
	type: string,
	width: number,
	height: number,
): Rect | null => {
	const inset = LEGACY_INSET_BY_TYPE[type](width, height);
	if (inset === null) {
		return null;
	}
	return {
		x: -width / 2 + inset.left + TEXT_BOX_PADDING_X,
		y: -height / 2 + inset.top + TEXT_BOX_PADDING_Y,
		width: Math.max(
			0,
			width - inset.left - inset.right - TEXT_BOX_PADDING_X * 2,
		),
		height: Math.max(
			0,
			height - inset.top - inset.bottom - TEXT_BOX_PADDING_Y * 2,
		),
	};
};

/** Boxes chosen to exercise both aspect ratios and the clamps at either end. */
const SIZES: readonly (readonly [number, number])[] = [
	[200, 100],
	[240, 80],
	[80, 240],
	[120, 120],
	[400, 60],
	[60, 400],
	[24, 16],
];

const expectRectCloseTo = (actual: Rect, expected: Rect): void => {
	expect(actual.x).toBeCloseTo(expected.x, 6);
	expect(actual.y).toBeCloseTo(expected.y, 6);
	expect(actual.width).toBeCloseTo(expected.width, 6);
	expect(actual.height).toBeCloseTo(expected.height, 6);
};

describe("resolveContentBox agrees with the content-inset table it replaced", () => {
	Object.keys(LEGACY_INSET_BY_TYPE).forEach((type) => {
		it(`${type}`, () => {
			SIZES.forEach(([width, height]) => {
				const actual = contentRectOf({ type, width, height });
				const expected = legacyContentBox(type, width, height);
				if (expected === null) {
					expect(actual).toBeNull();
					return;
				}
				expect(actual, `${type} ${width}x${height}`).not.toBeNull();
				expectRectCloseTo(actual as Rect, expected);
			});
		});
	});
});

describe("what the declaration answers better than the table could", () => {
	// The table was given a type and a size and could not see `tail.side`, so
	// every callout was measured with the default downward tail — a left- or
	// right-tailed one was credited with a quarter of its width that it does not
	// have. The declaration reads the field.
	it("callout: the tail band comes off whichever edge the tail sits on", () => {
		const size = { type: "callout", width: 200, height: 100 };
		const withDefaultTail = contentRectOf(size) as Rect;
		const withLeftTail = contentRectOf({
			...size,
			tail: { side: "left", position: 0.2 },
		}) as Rect;

		// Default (bottom) tail: the band is a quarter of the height.
		expectRectCloseTo(withDefaultTail, {
			x: -100 + TEXT_BOX_PADDING_X,
			y: -50 + TEXT_BOX_PADDING_Y,
			width: 200 - TEXT_BOX_PADDING_X * 2,
			height: 100 * 0.75 - TEXT_BOX_PADDING_Y * 2,
		});
		// Left tail: a quarter of the width, which the table charged to the height.
		expectRectCloseTo(withLeftTail, {
			x: -100 + 200 * 0.25 + TEXT_BOX_PADDING_X,
			y: -50 + TEXT_BOX_PADDING_Y,
			width: 200 * 0.75 - TEXT_BOX_PADDING_X * 2,
			height: 100 - TEXT_BOX_PADDING_Y * 2,
		});
	});

	// Likewise `headerHeight`: the table only knew the default 28px band.
	it("container: the title band follows the object's own headerHeight", () => {
		const box = contentRectOf({
			type: "container",
			width: 240,
			height: 160,
			headerHeight: 48,
		}) as Rect;
		expect(box.height).toBeCloseTo(48 - TEXT_BOX_PADDING_Y * 2, 6);
	});

	// A type nothing ships declares nothing, and is now told apart from a shipped
	// type whose box does not hold its text rather than measured as a plain box.
	it("an unshipped type is unknown rather than unmeasurable", () => {
		expect(
			resolveContentBox({
				type: "somethingNobodyShips",
				width: 200,
				height: 100,
			}),
		).toEqual({ kind: "unknown" });
	});

	// `group` carries no text, so there was never anything to measure; the table
	// answered with the whole box because it had no entry for it.
	it("group has no content box, carrying no text", () => {
		expect(
			resolveContentBox({ type: "group", width: 200, height: 100 }),
		).toEqual({ kind: "outside" });
	});
});
