/**
 * How far a shape's drawn outline keeps its text off each edge of the bounding
 * box, in local pixels. What the rendering layer's `textRegion` calculator
 * produces, restated here as numbers.
 *
 * PROVISIONAL — this table is a copy, not the source. The values a shape is
 * actually drawn with live in each plugin's `presentation/**` (registered as
 * `ObjectTypeDefinition.textRegion`), which is React-side and takes a resolved
 * object state, so a Node-side diagnosis cannot call it. Every entry below names
 * the file it was read off; a change there has to be repeated here until the
 * declaration moves onto the doc definition (see the package README).
 */
export type ContentInset = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

/**
 * Where a shape's text goes, given the size of its box.
 *
 * `null` means the text is not held by the box at all — either the shape draws
 * its label outside the outline (the pictograms, the group markers), or the box
 * is divided into bands each sized from its own text (`record`), or the type
 * carries no text. Nothing about such a shape's width and height can make its
 * text overflow, so diagnosis skips it.
 */
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

/**
 * Half the shorter side: the radius of the round cap a stadium ends in, and the
 * depth that cap eats out of the text's row.
 */
const calcStadiumCapRadius = (width: number, height: number): number =>
	Math.min(width, height) / 2;

/** Header band a container draws its title in (ContainerDoc: CONTAINER_HEADER_HEIGHT). */
const CONTAINER_HEADER_HEIGHT = 28;

/** Corner the fold of a `card` / `loopLimit` cuts off (CardDoc: CARD_CUT_RATIO). */
const CORNER_CUT_RATIO = 0.25;

/**
 * The inset of every shipped type that has one, keyed by `type`. A type absent
 * from the table lays its text out over the whole box (`rect`, `text`, `sticky`,
 * `markdown`, `umlComponent`, `group`).
 *
 * Ratios are of the box's own width (left / right) or height (top / bottom), and
 * anything given in pixels is written as a calculator, since several outlines are
 * built from `min(width, height)` and do not scale with either alone.
 */
const CONTENT_INSET_BY_TYPE: Readonly<Record<string, ContentInsetCalculator>> =
	{
		// packages/canvas — rendering/objects/primitives/Ellipse/calcEllipseTextRegion.ts
		// The largest rectangle inscribed in the ellipse.
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
		// DB_CAP_RATIO = 0.12; the top cap is drawn whole, the bottom one half.
		db: byRatio({ top: 0.24, bottom: 0.12 }),
		// The right edge is a half-circle of radius height/2.
		delay: (_width, height) => ({ ...NO_INSET, right: height / 2 }),
		diamond: byRatio({ left: 0.25, right: 0.25, top: 0.25, bottom: 0.25 }),
		display: byRatio({ left: 0.15, right: 0.18 }),
		// DOCUMENT_WAVE_RATIO = 0.075, and the wave swings both ways.
		document: byRatio({ bottom: 0.15 }),
		extract: outsideTheBox,
		hexagon: byRatio({ left: 0.2, right: 0.2 }),
		loopLimit: (width, height) => ({
			...NO_INSET,
			top: Math.min(width, height) * CORNER_CUT_RATIO,
		}),
		manualInput: byRatio({ top: 0.25 }),
		// The stacked copies are offset by min(width, height) * 0.08, and the front
		// sheet keeps the wave of a plain document over what is left of the height.
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
		// presentation/Stadium/calcStadiumTextRegion.ts — the caps sit on the long
		// axis, so a box taller than it is wide is capped top and bottom instead.
		stadium: (width, height) => {
			const capRadius = calcStadiumCapRadius(width, height);
			return width >= height
				? { left: capRadius, right: capRadius, top: 0, bottom: 0 }
				: { left: 0, right: 0, top: capRadius, bottom: capRadius };
		},
		storedData: byRatio({ left: 0.125, right: 0.125 }),
		subroutine: byRatio({ left: 0.12, right: 0.12 }),
		trapezoid: byRatio({ left: 0.2, right: 0.2 }),

		// plugins/general-shapes — the pictograms carry their label under the drawing.
		actor: outsideTheBox,
		envelope: outsideTheBox,
		gear: outsideTheBox,
		lock: outsideTheBox,
		package: outsideTheBox,
		queue: outsideTheBox,
		server: outsideTheBox,
		cloud: byRatio({ left: 0.15, right: 0.15, top: 0.2, bottom: 0.2 }),
		// A title bar of 0.24 over a body padded by 0.06 all round.
		browserWindow: byRatio({ left: 0.06, right: 0.06, top: 0.3, bottom: 0.06 }),
		terminalWindow: byRatio({
			left: 0.06,
			right: 0.06,
			top: 0.3,
			bottom: 0.06,
		}),
		folder: byRatio({ left: 0.06, right: 0.06, top: 0.24, bottom: 0.06 }),
		// The dog-ear is the smaller of 0.3 of the width and 0.28 of the height.
		file: (width, height) => ({
			left: 0.06 * width,
			right: 0.06 * width,
			top: Math.min(width * 0.3, height * 0.28) + 0.06 * height,
			bottom: 0.06 * height,
		}),
		// SHIELD_SHOULDER_RATIO = 0.45: below the shoulders the outline tapers to a point.
		shield: byRatio({ left: 0.07, right: 0.07, top: 0.07, bottom: 0.55 }),
		smartphone: byRatio({ left: 0.14, right: 0.14, top: 0.13, bottom: 0.15 }),
		laptop: byRatio({ left: 0.17, right: 0.17, top: 0.05, bottom: 0.33 }),

		// plugins/annotation-shapes — the group markers hang their label off the tip.
		brace: outsideTheBox,
		bracket: outsideTheBox,
		bracketWithStem: outsideTheBox,
		// CALLOUT_TAIL_RATIO = 0.25 on whichever edge `tail.side` names. The default
		// tail points down, and this table cannot see the field, so a callout with a
		// left / right tail is measured with more width than it has.
		callout: byRatio({ bottom: 0.25 }),
		// NOTE_FOLD_RATIO = 0.2 of the shorter side, paid for in width alone.
		note: (width, height) => ({
			...NO_INSET,
			right: Math.min(width, height) * 0.2,
		}),

		// plugins/container-shapes — the title sits in the header band, the body of the
		// box being for the children.
		container: (_width, height) => ({
			...NO_INSET,
			bottom: height - Math.min(CONTAINER_HEADER_HEIGHT, height),
		}),

		// plugins/uml-shapes — a record's bands are each sized from their own text.
		record: outsideTheBox,
		umlPackage: (_width, height) => ({
			...NO_INSET,
			top: Math.max(0, Math.min(16, height * 0.25)),
		}),

		// plugins/lucide-icon-shape — a pictogram with no text of its own.
		lucideIcon: outsideTheBox,
	};

/**
 * How far the given type's outline keeps text off each edge of a `width` ×
 * `height` box, on top of the padding every text box has
 * ({@link import("./contentBox").contentBox} applies that).
 *
 * @param type - Object type name; one this package does not know lays its text over the whole box, like `rect`
 * @param width - Box width in local pixels; several outlines are built from `min(width, height)`, so both matter even for a purely horizontal inset
 * @param height - Box height in local pixels
 * @returns The four insets, or null for a type whose text the box does not hold (a label drawn outside it, text-sized bands, no text at all)
 */
export const calcContentInset = (
	type: string,
	width: number,
	height: number,
): ContentInset | null =>
	(CONTENT_INSET_BY_TYPE[type] ?? (() => NO_INSET))(width, height);
