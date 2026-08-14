import { describe, expect, it } from "vitest";

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

describe("extractTextSlotStyleDefaults", () => {
	it("takes the style half of a body type's creation defaults", () => {
		expect(
			extractTextSlotStyleDefaults(TextFeatures, TEXT_DOC_DEFAULTS),
		).toEqual({
			textAlign: "left",
			verticalAlign: "top",
			fontColor: TEXT_DOC_DEFAULTS.fontColor,
			fontSize: 16,
			fontWeight: "normal",
		});
	});

	it("leaves the family out, so an unset one keeps following the host theme", () => {
		const defaults = extractTextSlotStyleDefaults(
			TextFeatures,
			TEXT_DOC_DEFAULTS,
		);
		expect(TEXT_DOC_DEFAULTS.fontFamily).not.toBeUndefined();
		expect(defaults).not.toHaveProperty("fontFamily");
	});

	it("reads nothing from a slots type, whose styling is stored per slot", () => {
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
			extractTextSlotStyleDefaults(textlessFeatures, TEXT_DOC_DEFAULTS),
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
	registry.register("text", { textAlign: "left", verticalAlign: "top" });

	it("fills a registered type's defaults into what the slot leaves unset", () => {
		expect(registry.resolveSlotStyle("text", { text: "hello" })).toEqual({
			textAlign: "left",
			verticalAlign: "top",
		});
	});

	it("lets an explicit slot value win over the type's default", () => {
		expect(
			registry.resolveSlotStyle("text", { text: "hello", textAlign: "right" }),
		).toEqual({ textAlign: "right", verticalAlign: "top" });
	});

	it("is not shadowed by a key the slot carries as undefined", () => {
		expect(
			registry.resolveSlotStyle("text", {
				text: "hello",
				textAlign: undefined,
			}),
		).toEqual({ textAlign: "left", verticalAlign: "top" });
	});

	it("yields the slot's own fields alone for an unregistered type", () => {
		expect(
			registry.resolveSlotStyle("rect", { text: "hello", fontSize: 20 }),
		).toEqual({ fontSize: 20 });
	});

	it("drops the content, so the result is styling only", () => {
		expect(
			registry.resolveSlotStyle("text", { text: "hello" }),
		).not.toHaveProperty("text");
	});

	it("yields the type's defaults alone when there is no slot", () => {
		expect(registry.resolveSlotStyle("text", undefined)).toEqual({
			textAlign: "left",
			verticalAlign: "top",
		});
	});

	it("yields nothing when neither side has anything to say", () => {
		expect(registry.resolveSlotStyle("rect", undefined)).toEqual({});
	});
});
