import { BODY_TEXT_SLOT_ID, createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectState } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
} from "../definitions";
import { annotationPlugin } from "../plugin";
import {
	calcGroupMarkerTextRegion,
	calcGroupMarkerVisualBounds,
} from "../presentation/shared";
import { BRACE_DOC_DEFAULTS } from "../schema/brace/BraceDoc";
import { BRACKET_DOC_DEFAULTS } from "../schema/bracket/BracketDoc";
import { BRACKET_WITH_STEM_DOC_DEFAULTS } from "../schema/bracketWithStem/BracketWithStemDoc";

// The UI definitions place the label themselves (textRegion + visualBounds), so
// this reads what registration answers rather than the calculators alone: a
// "label" type declaring neither would get the core's caption under the box.
const registries = createCanvasRegistries({ plugins: [annotationPlugin] });

describe.each([
	["brace", braceDefinition, BRACE_DOC_DEFAULTS],
	["bracket", bracketDefinition, BRACKET_DOC_DEFAULTS],
	[
		"bracketWithStem",
		bracketWithStemDefinition,
		BRACKET_WITH_STEM_DOC_DEFAULTS,
	],
] as const)(
	"the %s's label as the canvas places it",
	(type, definition, defaults) => {
		const state = definition.mapper.toState({
			...defaults,
			id: `${type}-1`,
			text: "doc layer",
		} as never) as ObjectState & { width: number; height: number };

		it("is the text slot region calcGroupMarkerTextRegion answers, beyond the tip", () => {
			expect(
				registries.objectPartKind
					.get(type, "textSlot")
					?.region?.(state, BODY_TEXT_SLOT_ID),
			).toEqual(calcGroupMarkerTextRegion(state as never, BODY_TEXT_SLOT_ID));
		});

		it("widens the visual bounds by that region", () => {
			expect(registries.objectVisualBounds.get(type)?.(state)).toEqual(
				calcGroupMarkerVisualBounds(state as never),
			);
			// A left-facing marker's label lies left of its box.
			expect(registries.objectVisualBounds.get(type)?.(state).x).toBeLessThan(
				-state.width / 2,
			);
		});

		it("is created over a transparent background, the label sitting on the page", () => {
			expect(defaults).toMatchObject({ labelFill: "transparent" });
		});
	},
);
