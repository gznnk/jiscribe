import { describe, expect, it } from "vitest";

import {
	TextFeatures,
	TEXT_DOC_DEFAULTS,
} from "../../model/objects/primitives/text/TextDoc";
import { BODY_TEXT_SLOT_ID } from "../../model/objects/types/text/TextSlot";
import {
	createObjectTextStyleDefaultsRegistry,
	extractTextSlotStyleDefaults,
	readTextSlotStyleDefaults,
} from "../ObjectTextStyleDefaultsRegistry";

const slotsFeatures = { ...TextFeatures, text: "slots" } as const;
const sourceFeatures = { ...TextFeatures, text: "source" } as const;
const textlessFeatures = { ...TextFeatures, text: undefined } as const;

/** A two-slot type's declaration, the shape a `"slots"` type with named slots registers. */
const SLOT_STYLE_DEFAULTS = {
	byTextSlot: {
		name: {
			textAlign: "center",
			fontWeight: "bold",
			fontFamily: "Noto Sans JP",
		},
		rows: { textAlign: "left" },
	},
} as const;

describe("extractTextSlotStyleDefaults", () => {
	it("keys a body type's creation defaults under its single slot", () => {
		expect(
			extractTextSlotStyleDefaults(TextFeatures, TEXT_DOC_DEFAULTS),
		).toEqual({
			byTextSlot: {
				[BODY_TEXT_SLOT_ID]: {
					textAlign: "left",
					verticalAlign: "top",
					fontColor: TEXT_DOC_DEFAULTS.fontColor,
					fontSize: 16,
					fontWeight: "normal",
				},
			},
		});
	});

	it("leaves the family out, so an unset one keeps falling back to the shared default", () => {
		const defaults = extractTextSlotStyleDefaults(
			TextFeatures,
			TEXT_DOC_DEFAULTS,
		);
		expect(TEXT_DOC_DEFAULTS.fontFamily).not.toBeUndefined();
		expect(
			readTextSlotStyleDefaults(defaults, BODY_TEXT_SLOT_ID),
		).not.toHaveProperty("fontFamily");
	});

	it("takes a slots type's defaults from its own per-slot declaration", () => {
		expect(
			extractTextSlotStyleDefaults(
				slotsFeatures,
				TEXT_DOC_DEFAULTS,
				SLOT_STYLE_DEFAULTS,
			),
		).toEqual({
			byTextSlot: {
				name: { textAlign: "center", fontWeight: "bold" },
				rows: { textAlign: "left" },
			},
		});
	});

	it("drops a slot whose declaration sets no style field", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, undefined, {
				byTextSlot: { name: { textAlign: "center" }, rows: {} },
			}),
		).toEqual({ byTextSlot: { name: { textAlign: "center" } } });
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

describe("ObjectTextStyleDefaultsRegistry.resolveTextSlotStyle", () => {
	const registry = createObjectTextStyleDefaultsRegistry();
	registry.register("text", {
		byTextSlot: {
			[BODY_TEXT_SLOT_ID]: { textAlign: "left", verticalAlign: "top" },
		},
	});
	registry.register("record", {
		byTextSlot: {
			name: { textAlign: "center", fontWeight: "bold" },
			attributes: { textAlign: "left" },
		},
	});

	it("fills a registered slot's defaults into what the slot leaves unset", () => {
		expect(
			registry.resolveTextSlotStyle("text", BODY_TEXT_SLOT_ID, {
				text: "hello",
			}),
		).toEqual({
			textAlign: "left",
			verticalAlign: "top",
		});
	});

	it("lets an explicit slot value win over the slot's default", () => {
		expect(
			registry.resolveTextSlotStyle("text", BODY_TEXT_SLOT_ID, {
				text: "hello",
				textAlign: "right",
			}),
		).toEqual({ textAlign: "right", verticalAlign: "top" });
	});

	it("is not shadowed by a key the slot carries as undefined", () => {
		expect(
			registry.resolveTextSlotStyle("text", BODY_TEXT_SLOT_ID, {
				text: "hello",
				textAlign: undefined,
			}),
		).toEqual({ textAlign: "left", verticalAlign: "top" });
	});

	it("answers each slot of a multi-slot type with that slot's own defaults", () => {
		expect(
			registry.resolveTextSlotStyle("record", "name", { text: "User" }),
		).toEqual({ textAlign: "center", fontWeight: "bold" });
		expect(
			registry.resolveTextSlotStyle("record", "attributes", { text: [] }),
		).toEqual({ textAlign: "left" });
	});

	it("yields the slot's own fields alone for a slot the type does not declare", () => {
		expect(
			registry.resolveTextSlotStyle("record", "operations", {
				text: [],
				fontSize: 20,
			}),
		).toEqual({ fontSize: 20 });
	});

	it("yields the slot's own fields alone for an unregistered type", () => {
		expect(
			registry.resolveTextSlotStyle("rect", BODY_TEXT_SLOT_ID, {
				text: "hello",
				fontSize: 20,
			}),
		).toEqual({ fontSize: 20 });
	});

	it("drops the content, so the result is styling only", () => {
		expect(
			registry.resolveTextSlotStyle("text", BODY_TEXT_SLOT_ID, {
				text: "hello",
			}),
		).not.toHaveProperty("text");
	});

	it("yields the slot's defaults alone when there is no slot", () => {
		expect(
			registry.resolveTextSlotStyle("text", BODY_TEXT_SLOT_ID, undefined),
		).toEqual({
			textAlign: "left",
			verticalAlign: "top",
		});
	});

	it("yields nothing when neither side has anything to say", () => {
		expect(
			registry.resolveTextSlotStyle("rect", BODY_TEXT_SLOT_ID, undefined),
		).toEqual({});
	});
});

describe("ObjectTextStyleDefaultsRegistry.get on an everyTextSlot declaration", () => {
	const registry = createObjectTextStyleDefaultsRegistry();
	registry.register("table", {
		byTextSlot: { r0c0: { fontWeight: "bold" } },
		everyTextSlot: { fontColor: "auto" },
	});

	it("answers a slot id the type never named with the everyTextSlot defaults", () => {
		expect(registry.get("table", "r3c7")).toEqual({ fontColor: "auto" });
	});

	it("lets a slot's own entry win over everyTextSlot", () => {
		expect(registry.get("table", "r0c0")).toEqual({ fontWeight: "bold" });
	});

	it("yields undefined for a type declaring neither", () => {
		expect(registry.get("rect", "r0c0")).toBeUndefined();
	});
});

describe("extractTextSlotStyleDefaults on an everyTextSlot declaration", () => {
	it("keeps both kinds, each narrowed to the style fields", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, undefined, {
				byTextSlot: { r0c0: { fontWeight: "bold" } },
				everyTextSlot: { fontColor: "auto", fontFamily: "Noto Sans JP" },
			}),
		).toEqual({
			byTextSlot: { r0c0: { fontWeight: "bold" } },
			// The family is left out of defaults, as it is for a named slot.
			everyTextSlot: { fontColor: "auto" },
		});
	});

	it("drops everyTextSlot when its declaration sets no style field", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, undefined, {
				byTextSlot: { r0c0: { fontWeight: "bold" } },
				everyTextSlot: {},
			}),
		).toEqual({ byTextSlot: { r0c0: { fontWeight: "bold" } } });
	});

	it("returns undefined when a slots type declares both empty", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, undefined, {
				byTextSlot: {},
				everyTextSlot: {},
			}),
		).toBeUndefined();
	});
});

describe("ObjectTextStyleDefaultsRegistry.registerDefinition", () => {
	it("registers what the definition's defaults declare for the body", () => {
		const registry = createObjectTextStyleDefaultsRegistry();
		registry.registerDefinition("text", {
			features: TextFeatures,
			defaults: { type: "text", textAlign: "left", fontSize: 14 },
		});
		expect(registry.get("text", BODY_TEXT_SLOT_ID)).toEqual({
			textAlign: "left",
			fontSize: 14,
		});
	});

	it("registers nothing for a definition declaring no defaults", () => {
		const registry = createObjectTextStyleDefaultsRegistry();
		registry.registerDefinition("text", { features: TextFeatures });
		expect(registry.get("text", BODY_TEXT_SLOT_ID)).toBeUndefined();
	});
});

describe("extractTextSlotStyleDefaults for a source type", () => {
	it("keys the creation defaults under the single slot, emphasis left out", () => {
		expect(
			extractTextSlotStyleDefaults(sourceFeatures, TEXT_DOC_DEFAULTS),
		).toEqual({
			byTextSlot: {
				[BODY_TEXT_SLOT_ID]: {
					textAlign: "left",
					verticalAlign: "top",
					fontColor: TEXT_DOC_DEFAULTS.fontColor,
					fontSize: 16,
				},
			},
		});
		// The body form reads the same defaults and does take the weight.
		expect(TEXT_DOC_DEFAULTS.fontWeight).toBe("normal");
	});
});

describe("ObjectTextStyleDefaultsRegistry with a byTextSlot function", () => {
	const TITLE_STYLE = {
		textAlign: "center",
		fontWeight: "bold",
		fontFamily: "serif",
	} as const;
	const FAMILY_ONLY_STYLE = { fontFamily: "serif" } as const;
	const COLUMN_STYLE = { fontSize: 14, fontWeight: "normal" } as const;
	const readSlotStyle = (slotId: string) => {
		if (slotId === "title") {
			return TITLE_STYLE;
		}
		return slotId === "family-only" ? FAMILY_ONLY_STYLE : undefined;
	};
	const registry = createObjectTextStyleDefaultsRegistry();
	registry.registerDefinition("entity", {
		features: slotsFeatures,
		textSlotStyleDefaults: {
			everyTextSlot: COLUMN_STYLE,
			byTextSlot: readSlotStyle,
		},
	});

	it("answers with the style the function gives for its slot, picked to the style fields", () => {
		expect(registry.get("entity", "title")).toEqual({
			textAlign: "center",
			fontWeight: "bold",
		});
	});

	it("answers with the same object on every read of one style the function gives", () => {
		expect(registry.get("entity", "title")).toBe(
			registry.get("entity", "title"),
		);
	});

	it("falls back to everyTextSlot, unmerged, where the function answers undefined", () => {
		expect(registry.get("entity", "col:0:name")).toEqual(COLUMN_STYLE);
	});

	it("falls back to everyTextSlot where the function's style sets no style field once picked", () => {
		expect(registry.get("entity", "family-only")).toEqual(COLUMN_STYLE);
	});

	it("lets the slot's own fields win over the function's style", () => {
		expect(
			registry.resolveTextSlotStyle("entity", "title", {
				text: "t",
				fontWeight: "300",
			}),
		).toEqual({ textAlign: "center", fontWeight: "300" });
	});

	it("is carried by the extraction as declared, even declared alone", () => {
		expect(
			extractTextSlotStyleDefaults(slotsFeatures, undefined, {
				byTextSlot: readSlotStyle,
			}),
		).toEqual({ byTextSlot: readSlotStyle });
	});

	it("is read as declared, unnarrowed, by readTextSlotStyleDefaults off the unregistered declaration", () => {
		const declaration = {
			everyTextSlot: COLUMN_STYLE,
			byTextSlot: readSlotStyle,
		};

		expect(readTextSlotStyleDefaults(declaration, "title")).toBe(TITLE_STYLE);
		expect(readTextSlotStyleDefaults(declaration, "name")).toBe(COLUMN_STYLE);
	});

	it("keeps its picked styles per registry, so two registries never share one", () => {
		const otherRegistry = createObjectTextStyleDefaultsRegistry();
		otherRegistry.registerDefinition("entity", {
			features: slotsFeatures,
			textSlotStyleDefaults: {
				everyTextSlot: COLUMN_STYLE,
				byTextSlot: readSlotStyle,
			},
		});

		expect(otherRegistry.get("entity", "title")).toEqual(
			registry.get("entity", "title"),
		);
		expect(otherRegistry.get("entity", "title")).not.toBe(
			registry.get("entity", "title"),
		);
	});
});

describe("readTextSlotStyleDefaults with a byTextSlot map", () => {
	it("prefers the slot's own entry and otherwise falls back to everyTextSlot", () => {
		const defaults = {
			byTextSlot: { name: { textAlign: "center" } },
			everyTextSlot: { fontSize: 12 },
		} as const;
		expect(readTextSlotStyleDefaults(defaults, "name")).toBe(
			defaults.byTextSlot.name,
		);
		expect(readTextSlotStyleDefaults(defaults, "other")).toBe(
			defaults.everyTextSlot,
		);
		expect(readTextSlotStyleDefaults(undefined, "name")).toBeUndefined();
	});
});
