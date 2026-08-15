import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../controllers/registries/createCanvasRegistries";
import type { ObjectDoc } from "../../../../schemas/objects/base/ObjectDoc";
import type { ObjectFeatures } from "../../../../schemas/objects/types/ObjectFeatures";
import { builtinObjectDocDefinitions } from "../../../../schemas/registry/builtinObjectDocDefinitions";
import type { TextSlots } from "../../types/TextSlots";
import type { ObjectState } from "../ObjectState";
import { mapTextDocToState, mapTextStateToDoc } from "../TextSlotsMapper";

describe("mapTextDocToState", () => {
	it("moves a body doc's text and styling into the one body slot", () => {
		expect(mapTextDocToState("body", { text: "hello", fontSize: 20 })).toEqual({
			text: { body: { text: "hello", fontSize: 20 } },
		});
	});

	it("gives a body doc with nothing set one empty, unstyled slot", () => {
		expect(mapTextDocToState("body", {})).toEqual({
			text: { body: { text: "" } },
		});
	});

	it("omits a styling field the body doc left unset, rather than storing undefined", () => {
		const slots = mapTextDocToState("body", { text: "hello" }).text;
		expect(Object.keys(slots?.body ?? {})).toEqual(["text"]);
	});

	it("passes a slots doc through, copying the map instead of aliasing it", () => {
		const docText = { name: { text: "User" }, rows: { text: ["id"] } };
		const slots = mapTextDocToState("slots", { text: docText }).text;
		expect(slots).toEqual(docText);
		expect(slots).not.toBe(docText);
	});

	it("gives a slots doc with no text an empty map for its own mapper to fill", () => {
		expect(mapTextDocToState("slots", {})).toEqual({ text: {} });
	});

	it("keeps the authored key order of a slots doc", () => {
		const docText = {
			operations: { text: [] },
			name: { text: "User" },
			attributes: { text: [] },
		};
		expect(
			Object.keys(mapTextDocToState("slots", { text: docText }).text ?? {}),
		).toEqual(["operations", "name", "attributes"]);
	});

	it("drops integer-like slot ids, which JS would have re-sorted to the front", () => {
		const docText = {
			name: { text: "User" },
			"0": { text: "first" },
			"12": { text: "twelfth" },
			attributes: { text: [] },
		};
		expect(
			Object.keys(mapTextDocToState("slots", { text: docText }).text ?? {}),
		).toEqual(["name", "attributes"]);
	});

	it("keeps slot ids that only look numeric but keep their place", () => {
		const docText = {
			"01": { text: "padded" },
			"-1": { text: "negative" },
			"1a": { text: "suffixed" },
		};
		expect(
			Object.keys(mapTextDocToState("slots", { text: docText }).text ?? {}),
		).toEqual(["01", "-1", "1a"]);
	});

	it("contributes nothing at all for a text-less type", () => {
		expect(mapTextDocToState(undefined, { text: "hello" })).toEqual({});
	});
});

describe("mapTextStateToDoc", () => {
	it("flattens the body slot back onto the doc root", () => {
		expect(
			mapTextStateToDoc("body", { body: { text: "hello", fontColor: "auto" } }),
		).toEqual({ text: "hello", fontColor: "auto" });
	});

	it("contributes no text key for an empty body slot or an absent text", () => {
		expect(mapTextStateToDoc("body", { body: { text: "" } })).toEqual({});
		expect(mapTextStateToDoc("body", undefined)).toEqual({});
	});

	it("keeps the styling of an emptied body slot, only the content dropping out", () => {
		expect(
			mapTextStateToDoc("body", { body: { text: "", fontSize: 20 } }),
		).toEqual({ fontSize: 20 });
	});

	it("emits a slots shape's map unchanged, including empty contents", () => {
		const slots = { name: { text: "" }, rows: { text: [] } };
		expect(mapTextStateToDoc("slots", slots)).toEqual({ text: slots });
	});

	it("contributes nothing at all for a text-less type", () => {
		expect(mapTextStateToDoc(undefined, { body: { text: "hello" } })).toEqual(
			{},
		);
	});
});

describe("doc ↔ state text round-trip", () => {
	it("is the identity from the state side, for both shapes", () => {
		const bodySlots: TextSlots = { body: { text: "hello", fontSize: 20 } };
		expect(
			mapTextDocToState("body", mapTextStateToDoc("body", bodySlots)),
		).toEqual({ text: bodySlots });

		const keyedSlots: TextSlots = {
			name: { text: "User", fontWeight: "bold" },
			rows: { text: ["id"] },
		};
		expect(
			mapTextDocToState("slots", mapTextStateToDoc("slots", keyedSlots)),
		).toEqual({ text: keyedSlots });
	});

	it("is idempotent from the doc side, normalizing an empty text to absent", () => {
		for (const doc of [{}, { text: "" }, { text: "hello", fontSize: 20 }]) {
			const once = mapTextStateToDoc(
				"body",
				mapTextDocToState("body", doc).text,
			);
			const twice = mapTextStateToDoc(
				"body",
				mapTextDocToState("body", once).text,
			);
			expect(twice).toEqual(once);
		}
		expect(
			mapTextStateToDoc("body", mapTextDocToState("body", { text: "" }).text),
		).toEqual({});
	});
});

/**
 * The invariant the whole slot mechanism rests on: for every registered type the
 * mapper — not the shape's own code — decides which slots exist. Pinning it here
 * keeps "the keys of state.text are the authority on slots" true for the editing
 * side (first key = the Enter default) and the rendering side (one overlay per key).
 */
describe("mapper invariant across every built-in type", () => {
	const registries = createCanvasRegistries();
	const types: [string, ObjectFeatures][] = Object.entries(
		builtinObjectDocDefinitions,
	).map(([type, definition]) => [type, definition.features]);

	const toState = (doc: Record<string, unknown>): Record<string, unknown> =>
		registries.objectMapper.toState(
			doc as unknown as ObjectDoc,
		) as unknown as Record<string, unknown>;
	const toDoc = (state: Record<string, unknown>): Record<string, unknown> =>
		registries.objectMapper.toDoc(
			state as unknown as ObjectState,
		) as unknown as Record<string, unknown>;

	// The slot invariants below do not depend on geometry, but the identity
	// assertion does: toDoc rounds, and rounding an absent coordinate yields NaN
	// where passing it through yielded undefined. Give each family a real box so
	// the comparison is over numbers.
	const geometryFields = (
		features: ObjectFeatures,
	): Record<string, unknown> => {
		switch (features.geometry) {
			case "rect":
				return { x: 10, y: 20, width: 30, height: 40 };
			case "ellipse":
				return { cx: 10, cy: 20, rx: 15, ry: 20 };
			default:
				return {};
		}
	};

	// Every built-in type spells its text as a single body; the keyed shape is
	// exercised by the record plugin's own mapper tests.
	const textTypes = types.filter(([, features]) => features.text === "body");
	const textlessTypes = types.filter(
		([, features]) => features.text === undefined,
	);

	it.each(textTypes)("%s: has its slot keys present and typed", (type) => {
		const withoutText = toState({ id: `${type}-1`, type });
		expect(withoutText.text).toEqual({ body: { text: "" } });

		const withText = toState({ id: `${type}-1`, type, text: "hello" });
		expect(withText.text).toEqual({ body: { text: "hello" } });
	});

	it.each(textTypes)("%s: carries the doc's styling into the slot", (type) => {
		const state = toState({
			id: `${type}-1`,
			type,
			text: "hello",
			fontSize: 20,
		});
		expect(state.text).toEqual({ body: { text: "hello", fontSize: 20 } });
		expect("fontSize" in state).toBe(false);
	});

	it.each(textTypes)(
		"%s: state → doc → state is the identity",
		(type, features) => {
			const state = toState({
				id: `${type}-1`,
				type,
				text: "hello",
				fontSize: 20,
				...geometryFields(features),
			});
			expect(toState(toDoc(state))).toEqual(state);
		},
	);

	it.each(textTypes)("%s: doc → state → doc is deterministic", (type) => {
		const doc = toDoc(toState({ id: `${type}-1`, type, text: "hello" }));
		expect(doc.text).toBe("hello");
		expect(toDoc(toState(doc))).toEqual(doc);

		// An empty text is the one doc form that normalizes (to absent), and stays there.
		const emptied = toDoc(toState({ id: `${type}-1`, type, text: "" }));
		expect("text" in emptied).toBe(false);
		expect(toDoc(toState(emptied))).toEqual(emptied);
	});

	it.each(textlessTypes)("%s: gains no text field at all", (type) => {
		const state = toState({ id: `${type}-1`, type });
		expect("text" in state).toBe(false);
		expect("text" in toDoc(state)).toBe(false);
	});
});
