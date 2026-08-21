import { describe, expect, it } from "vitest";

import { BODY_TEXT_SLOT_ID } from "../../../constants/textSlotId";
import {
	TextFeatures,
	TEXT_DOC_DEFAULTS,
} from "../../objects/primitives/text/TextDoc";
import {
	createObjectTextStyleDefaultsRegistry,
	extractTextSlotStyleDefaults,
} from "../ObjectTextStyleDefaultsRegistry";

const slotsFeatures = { ...TextFeatures, text: "slots" } as const;
const textlessFeatures = { ...TextFeatures, text: undefined } as const;

/** A two-slot type's declaration, the shape a `"slots"` type registers. */
const SLOT_STYLE_DEFAULTS = {
	name: { textAlign: "center", fontWeight: "bold", fontFamily: "Noto Sans JP" },
	rows: { textAlign: "left" },
} as const;

describe("extractTextSlotStyleDefaults", () => {
	it("keys a body type's creation defaults under its single slot", () => {
		expect(
			extractTextSlotStyleDefaults(TextFeatures, TEXT_DOC_DEFAULTS),
		).toEqual({
			[BODY_TEXT_SLOT_ID]: {
				textAlign: "left",
				verticalAlign: "top",
				fontColor: TEXT_DOC_DEFAULTS.fontColor,
				fontSize: 16,
				fontWeight: "normal",
			},
		});
	});

	it("leaves the family out, so an unset one keeps falling back to the shared default", () => {
		const defaults = extractTextSlotStyleDefaults(
			TextFeatures,
			TEXT_DOC_DEFAULTS,
		);
		expect(TEXT_DOC_DEFAULTS.fontFamily).not.toBeUndefined();
		expect(defaults?.[BODY_TEXT_SLOT_ID]).not.toHaveProperty("fontFamily");
	});

	it("takes a slots type's defaults from its own per-slot declaration", () => {
		expect(
			extractTextSlotStyleDefaults(
				slotsFeatures,
				TEXT_DOC_DEFAULTS,
				SLOT_STYLE_DEFAULTS,
			),
		).toEqual({
			name: { textAlign: "center", fontWeight: "bold" },
			rows: { textAlign: "left" },
		});
	});

	it("drops a slot whose declaration sets no style field", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, undefined, {
				name: { textAlign: "center" },
				rows: {},
			}),
		).toEqual({ name: { textAlign: "center" } });
	});

	it("returns undefined for a slots type that declares no per-slot defaults", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, TEXT_DOC_DEFAULTS),
		).toBeUndefined();
	});

	it("returns undefined for a type that declares no defaults at all", () => {
		expect(
			extractTextSlotStyleDefaults(TextFeatures, undefined),
		).toBeUndefined();
	});

	it("returns undefined for a type holding no text", () => {
		expect(
			extractTextSlotStyleDefaults(
				textlessFeatures,
				TEXT_DOC_DEFAULTS,
				SLOT_STYLE_DEFAULTS,
			),
		).toBeUndefined();
	});

	it("returns undefined when the defaults set no style field", () => {
		expect(
			extractTextSlotStyleDefaults(TextFeatures, { type: "x", x: 0, y: 0 }),
		).toBeUndefined();
	});
});

describe("ObjectTextStyleDefaultsRegistry.resolveSlotStyle", () => {
	const registry = createObjectTextStyleDefaultsRegistry();
	registry.register("text", {
		[BODY_TEXT_SLOT_ID]: { textAlign: "left", verticalAlign: "top" },
	});
	registry.register("record", {
		name: { textAlign: "center", fontWeight: "bold" },
		attributes: { textAlign: "left" },
	});

	it("fills a registered slot's defaults into what the slot leaves unset", () => {
		expect(
			registry.resolveSlotStyle("text", BODY_TEXT_SLOT_ID, { text: "hello" }),
		).toEqual({
			textAlign: "left",
			verticalAlign: "top",
		});
	});

	it("lets an explicit slot value win over the slot's default", () => {
		expect(
			registry.resolveSlotStyle("text", BODY_TEXT_SLOT_ID, {
				text: "hello",
				textAlign: "right",
			}),
		).toEqual({ textAlign: "right", verticalAlign: "top" });
	});

	it("is not shadowed by a key the slot carries as undefined", () => {
		expect(
			registry.resolveSlotStyle("text", BODY_TEXT_SLOT_ID, {
				text: "hello",
				textAlign: undefined,
			}),
		).toEqual({ textAlign: "left", verticalAlign: "top" });
	});

	it("answers each slot of a multi-slot type with that slot's own defaults", () => {
		expect(
			registry.resolveSlotStyle("record", "name", { text: "User" }),
		).toEqual({ textAlign: "center", fontWeight: "bold" });
		expect(
			registry.resolveSlotStyle("record", "attributes", { text: [] }),
		).toEqual({ textAlign: "left" });
	});

	it("yields the slot's own fields alone for a slot the type does not declare", () => {
		expect(
			registry.resolveSlotStyle("record", "operations", {
				text: [],
				fontSize: 20,
			}),
		).toEqual({ fontSize: 20 });
	});

	it("yields the slot's own fields alone for an unregistered type", () => {
		expect(
			registry.resolveSlotStyle("rect", BODY_TEXT_SLOT_ID, {
				text: "hello",
				fontSize: 20,
			}),
		).toEqual({ fontSize: 20 });
	});

	it("drops the content, so the result is styling only", () => {
		expect(
			registry.resolveSlotStyle("text", BODY_TEXT_SLOT_ID, { text: "hello" }),
		).not.toHaveProperty("text");
	});

	it("yields the slot's defaults alone when there is no slot", () => {
		expect(
			registry.resolveSlotStyle("text", BODY_TEXT_SLOT_ID, undefined),
		).toEqual({
			textAlign: "left",
			verticalAlign: "top",
		});
	});

	it("yields nothing when neither side has anything to say", () => {
		expect(
			registry.resolveSlotStyle("rect", BODY_TEXT_SLOT_ID, undefined),
		).toEqual({});
	});
});
