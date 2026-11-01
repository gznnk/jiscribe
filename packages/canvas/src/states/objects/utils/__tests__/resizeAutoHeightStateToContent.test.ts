import { calcFullBoxTextRegion } from "@jiscribe/doc/plugin/ObjectDocTextRegion";
import { AUTO_HEIGHT_COMFORT_PADDING_EM } from "@jiscribe/doc/text/block/autoHeightComfortPadding";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "@jiscribe/doc/text/block/textBoxPadding";
import { calcVisualTextHeight } from "@jiscribe/doc/text/layout/calcVisualTextHeight";
import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../base/ObjectState";
import { resizeAutoHeightStateToContent } from "../resizeAutoHeightStateToContent";

/** A rect-shaped state holding one body of text, as the mapper hands one over. */
const autoHeightState = (
	overrides: Record<string, unknown> = {},
): ObjectState =>
	({
		id: "auto",
		type: "rect",
		cx: 100,
		cy: 20,
		width: 200,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		autoHeight: true,
		text: {
			body: { text: "a label long enough to take several lines", fontSize: 16 },
		},
		...overrides,
	}) as unknown as ObjectState;

/** The state's top edge, which a re-measure must leave where it was. */
const topOf = (state: ObjectState): number => {
	const frame = state as unknown as { cy: number; height: number };
	return frame.cy - frame.height / 2;
};

/** The re-measured height, the whole point of the pass. */
const heightOf = (state: ObjectState): number =>
	(state as unknown as { height: number }).height;

describe("resizeAutoHeightStateToContent", () => {
	it("grows the box to the height its text needs, keeping the top edge", () => {
		const state = autoHeightState();

		const resized = resizeAutoHeightStateToContent(
			state,
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);

		expect(heightOf(resized)).toBeGreaterThan(0);
		expect(topOf(resized)).toBe(topOf(state));
	});

	it("leaves room above and below the text, which the ObjectMenu then writes in", () => {
		// The height this pass settles on is the one ToggleAutoHeightCommand stores
		// when the shape is switched to a stated height, so the room has to be in it.
		const fontSize = 16;
		const text = "one line";
		const state = autoHeightState({ text: { body: { text, fontSize } } });

		const resized = resizeAutoHeightStateToContent(
			state,
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);

		const textHeight = calcVisualTextHeight(
			text,
			{
				fontSize,
				fontFamily: DEFAULT_FONT_FAMILY,
				fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
			},
			200 - TEXT_BOX_PADDING_X * 2,
		);
		expect(heightOf(resized)).toBe(
			textHeight +
				TEXT_BOX_PADDING_Y * 2 +
				fontSize * AUTO_HEIGHT_COMFORT_PADDING_EM * 2,
		);
	});

	it("leaves the room it is handed, the one-line seed box included", () => {
		const heightWith = (
			paddingEm: number,
			region = calcFullBoxTextRegion,
		): number =>
			heightOf(
				resizeAutoHeightStateToContent(
					autoHeightState({
						text: { body: { text: "one line", fontSize: 16 } },
					}),
					region,
					paddingEm,
				),
			);
		const thinBand = (): Rect => ({ x: -100, y: 0, width: 200, height: 1 });

		// 16px body × 0.5em more above and below.
		expect(heightWith(1.25) - heightWith(0.75)).toBe(16);
		expect(heightWith(1.25, thinBand) - heightWith(0.75, thinBand)).toBe(16);
	});

	it("returns the state itself once the height is the derived one", () => {
		const state = autoHeightState();
		const resized = resizeAutoHeightStateToContent(
			state,
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);

		expect(
			resizeAutoHeightStateToContent(
				resized,
				calcFullBoxTextRegion,
				AUTO_HEIGHT_COMFORT_PADDING_EM,
			),
		).toBe(resized);
	});

	it("leaves a shape that states its own height untouched", () => {
		const state = autoHeightState({ autoHeight: undefined, height: 40 });

		expect(
			resizeAutoHeightStateToContent(
				state,
				calcFullBoxTextRegion,
				AUTO_HEIGHT_COMFORT_PADDING_EM,
			),
		).toBe(state);
	});

	it("re-wraps at the width it is given, so a wider box comes out shorter", () => {
		const narrow = resizeAutoHeightStateToContent(
			autoHeightState({ width: 120 }),
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);
		const wide = resizeAutoHeightStateToContent(
			autoHeightState({ width: 400 }),
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);

		expect(heightOf(wide)).toBeLessThan(heightOf(narrow));
	});

	it("measures against the region the type declares, not against the box", () => {
		/** Half the box, as a shape reserving the rest for something else does. */
		const halfBoxRegion = ({
			width,
			height,
		}: {
			width: number;
			height: number;
		}): Rect => ({
			x: -width / 2,
			y: -height / 2,
			width: width / 2,
			height,
		});
		const full = resizeAutoHeightStateToContent(
			autoHeightState(),
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);
		const halved = resizeAutoHeightStateToContent(
			autoHeightState(),
			halfBoxRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);

		expect(heightOf(halved)).toBeGreaterThan(heightOf(full));
	});

	it("measures with the type's own defaults where the slot sets nothing", () => {
		const unstyled = autoHeightState({ text: { body: { text: "one line" } } });

		const small = resizeAutoHeightStateToContent(
			unstyled,
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
			{ fontSize: 10 },
		);
		const large = resizeAutoHeightStateToContent(
			unstyled,
			calcFullBoxTextRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
			{ fontSize: 40 },
		);

		expect(heightOf(large)).toBeGreaterThan(heightOf(small));
	});

	it("gives a fresh seed a one-line box where no height holds the text", () => {
		// A region too thin for any text: the derivation answers null. A shape
		// that was measured before keeps that measurement, but the mapper's fresh
		// seed is 0 — a reloaded document must not draw the shape invisible, so
		// the seed alone falls back to a one-line box, top edge kept.
		const thinBand = (): Rect => ({ x: -100, y: 0, width: 200, height: 1 });

		const fromSeed = resizeAutoHeightStateToContent(
			autoHeightState({ height: 0 }),
			thinBand,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);
		expect(heightOf(fromSeed)).toBe(48);
		expect(topOf(fromSeed)).toBe(20);

		const measuredBefore = autoHeightState({ height: 80 });
		expect(
			resizeAutoHeightStateToContent(
				measuredBefore,
				thinBand,
				AUTO_HEIGHT_COMFORT_PADDING_EM,
			),
		).toBe(measuredBefore);
	});

	it("grows the box for a body switched onto the whole height", () => {
		/** A cap off the top alone, as a cylinder's declared region has. */
		const cappedRegion = ({
			width,
			height,
		}: {
			width: number;
			height: number;
		}): Rect => ({
			x: -width / 2,
			y: -height / 2 + height * 0.25,
			width,
			height: height * 0.75,
		});
		const onRegion = resizeAutoHeightStateToContent(
			autoHeightState(),
			cappedRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);
		const onFrame = resizeAutoHeightStateToContent(
			autoHeightState({ textVerticalBasis: "frame" }),
			cappedRegion,
			AUTO_HEIGHT_COMFORT_PADDING_EM,
		);

		// Centred on the whole height, the block reaches the cap first, so the box
		// has to be taller for it to stay off it.
		expect(heightOf(onFrame)).toBeGreaterThan(heightOf(onRegion));
	});

	it("derives one height either way where the region is centred on the box", () => {
		expect(
			heightOf(
				resizeAutoHeightStateToContent(
					autoHeightState({ textVerticalBasis: "frame" }),
					calcFullBoxTextRegion,
					AUTO_HEIGHT_COMFORT_PADDING_EM,
				),
			),
		).toBe(
			heightOf(
				resizeAutoHeightStateToContent(
					autoHeightState(),
					calcFullBoxTextRegion,
					AUTO_HEIGHT_COMFORT_PADDING_EM,
				),
			),
		);
	});

	it("measures against the whole box for a type declaring no region", () => {
		const state = autoHeightState();

		expect(
			heightOf(
				resizeAutoHeightStateToContent(
					state,
					undefined,
					AUTO_HEIGHT_COMFORT_PADDING_EM,
				),
			),
		).toBe(
			heightOf(
				resizeAutoHeightStateToContent(
					state,
					calcFullBoxTextRegion,
					AUTO_HEIGHT_COMFORT_PADDING_EM,
				),
			),
		);
	});
});
