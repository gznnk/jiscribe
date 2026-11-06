import { BODY_TEXT_SLOT_ID, createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectState } from "@jiscribe/canvas";
import { calcLabelTextVisualBounds } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
} from "../definitions";
import { annotationPlugin } from "../plugin";
import { BRACE_DOC_DEFAULTS } from "../schema/brace/BraceDoc";
import { BRACKET_DOC_DEFAULTS } from "../schema/bracket/BracketDoc";
import { BRACKET_WITH_STEM_DOC_DEFAULTS } from "../schema/bracketWithStem/BracketWithStemDoc";
import { calcGroupMarkerLabelRegion } from "../schema/shared/calcGroupMarkerLabelRegion";

// The doc definitions declare where the label goes (labelRegion); the core is what
// places the drawn label and widens the visual bounds from it, so this reads the
// registered answers rather than the calculator alone.
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
		const body = (state as { text?: Record<string, object> }).text?.[
			BODY_TEXT_SLOT_ID
		];
		const typeDefaults = registries.objectTextStyleDefaults.get(
			type,
			BODY_TEXT_SLOT_ID,
		);

		it("is the text slot region its labelRegion answers, beyond the tip", () => {
			expect(
				registries.objectPartKind
					.get(type, "textSlot")
					?.region?.(state, BODY_TEXT_SLOT_ID),
			).toEqual(calcGroupMarkerLabelRegion(state, body, typeDefaults));
		});

		it("widens the visual bounds by that region", () => {
			expect(registries.objectVisualBounds.get(type)?.(state)).toEqual(
				calcLabelTextVisualBounds(
					state,
					body,
					typeDefaults,
					calcGroupMarkerLabelRegion,
				),
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
