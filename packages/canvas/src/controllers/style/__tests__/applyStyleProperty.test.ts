import type { StyleValueType } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import { describe, it, expect } from "vitest";

import { connectorOf, groupOf, rectOf } from "./support/styleFixtures";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { BUILTIN_OBJECT_DEFINITIONS } from "../../registries/applyObjectDefinition";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { applyStyleProperty } from "../applyStyleProperty";

const VALID_INPUT: Record<StyleValueType, string> = {
	string: "test-value",
	number: "7",
	boolean: "true",
};

const EXPECTED_OUTPUT: Record<StyleValueType, string | number | boolean> = {
	string: "test-value",
	number: 7,
	boolean: true,
};

// The real bundle wiring, so these cases also guard that applyObjectDefinition
// turns every ObjectTypeDefinition.extraStyleProperties declaration into an
// entry of that type's table.
const registries = createTestRegistries();

/** Every shape-declared extra property wired via BUILTIN_OBJECT_DEFINITIONS. */
const EXTRA_DECLARATIONS = Object.entries(BUILTIN_OBJECT_DEFINITIONS).flatMap(
	([type, definition]) =>
		Object.entries(definition.extraStyleProperties ?? {}).map(
			([property, descriptor]) => ({ type, property, descriptor }),
		),
);

type MinState = Pick<
	CanvasControllerState,
	"selection" | "objects" | "multiSelectGroup" | "textEditState"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		selection: selectionOf([]),
		objects: {},
		multiSelectGroup: null,
		textEditState: null,
		...overrides,
	}) as unknown as CanvasControllerState;

const applied = (
	state: CanvasControllerState,
	property: string,
	value: string,
): CanvasControllerState =>
	applyStyleProperty(state, property, value, registries);

/** Pre-creates the parent chain for a dot-path property ("label.fill" → { label: {} }). */
const parentScaffold = (path: readonly string[]): Record<string, unknown> => {
	if (path.length <= 1) {
		return {};
	}
	const [head, ...rest] = path;
	return { [head]: parentScaffold(rest) };
};

const readAtPath = (object: unknown, path: readonly string[]): unknown =>
	path.reduce(
		(parent, key) => (parent as Record<string, unknown> | undefined)?.[key],
		object,
	);

describe("applyStyleProperty (the transport boundary)", () => {
	describe("the engine's own vocabulary reaches the style tables", () => {
		it("fill lands on a type that takes it", () => {
			const a = rectOf("a", { fill: "#fff" });
			const result = applied(
				makeState({ selection: selectionOf(["a"]), objects: { a } }),
				"fill",
				"#123456",
			);
			expect((result.objects["a"] as unknown as { fill: string }).fill).toBe(
				"#123456",
			);
		});

		it("fill on a type that does not take it → the same reference", () => {
			const c = connectorOf("c");
			const state = makeState({
				selection: selectionOf(["c"]),
				objects: { c },
			});
			expect(applied(state, "fill", "#123456")).toBe(state);
		});

		it("a number property is read as one", () => {
			const c = connectorOf("c");
			const result = applied(
				makeState({ selection: selectionOf(["c"]), objects: { c } }),
				"strokeWidth",
				"3",
			);
			expect(
				(result.objects["c"] as unknown as { strokeWidth: number }).strokeWidth,
			).toBe(3);
		});

		it("a string no number can be made of → the same reference", () => {
			const c = connectorOf("c");
			const state = makeState({
				selection: selectionOf(["c"]),
				objects: { c },
			});
			expect(applied(state, "strokeWidth", "abc")).toBe(state);
		});

		it("a basis that is neither of the two throws rather than writing", () => {
			const a = rectOf("a");
			const state = makeState({
				selection: selectionOf(["a"]),
				objects: { a },
			});
			expect(() => applied(state, "textVerticalBasis", "middle")).toThrow(
				/textVerticalBasis/,
			);
		});
	});

	describe("the multi-selection lock lands on the selection box", () => {
		it("the box is written and no member of it is", () => {
			const a = rectOf("a");
			const multiSelectGroup = {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"];
			const result = applied(
				makeState({
					selection: selectionOf(["a"]),
					objects: { a },
					multiSelectGroup,
				}),
				"lockAspectRatio",
				"false",
			);
			expect(result.multiSelectGroup?.lockAspectRatio).toBe(false);
			expect(result.objects["a"]).toBe(a);
		});

		it("with no box drawn the selected object carries it instead", () => {
			const a = rectOf("a");
			const result = applied(
				makeState({ selection: selectionOf(["a"]), objects: { a } }),
				"lockAspectRatio",
				"true",
			);
			expect(
				(result.objects["a"] as unknown as { lockAspectRatio: boolean })
					.lockAspectRatio,
			).toBe(true);
		});
	});

	describe("a name the vocabulary does not own is a shape's own declaration", () => {
		it("a declared name lands on the declaring shape", () => {
			const c = connectorOf("c", { label: { text: "Yes" } });
			const result = applied(
				makeState({ selection: selectionOf(["c"]), objects: { c } }),
				"label.fill",
				"#ff0000",
			);
			expect(
				(result.objects["c"] as unknown as { label: { fill: string } }).label
					.fill,
			).toBe("#ff0000");
		});

		it("a declared name reaches declaring descendants of a selected group", () => {
			const g = groupOf("g", ["c"]);
			const c = connectorOf("c", { label: { text: "Yes" } });
			const result = applied(
				makeState({ selection: selectionOf(["g"]), objects: { g, c } }),
				"label.fill",
				"#112233",
			);
			expect(
				(result.objects["c"] as unknown as { label: { fill: string } }).label
					.fill,
			).toBe("#112233");
		});

		it("a name nobody declares applies to nothing", () => {
			const a = rectOf("a");
			const state = makeState({
				selection: selectionOf(["a"]),
				objects: { a },
			});
			expect(applied(state, "notAProperty", "x")).toBe(state);
		});

		it("nothing selected → the same reference", () => {
			const state = makeState();
			expect(applied(state, "label.fill", "#ff0000")).toBe(state);
		});
	});

	describe("every built-in declaration (registry-driven)", () => {
		it("the wiring exposes at least one extra declaration (e.g. connector label.*)", () => {
			expect(EXTRA_DECLARATIONS.length).toBeGreaterThan(0);
		});

		for (const { type, property, descriptor } of EXTRA_DECLARATIONS) {
			const path = property.split(".");
			const validValue = VALID_INPUT[descriptor.valueType];
			const expected = EXPECTED_OUTPUT[descriptor.valueType];

			it(`${type} / ${property}: applied and read as the declared type on the declaring shape`, () => {
				const o1 = {
					id: "o1",
					type,
					features: { type, geometry: "rect" },
					...parentScaffold(path),
				} as unknown as ObjectState;
				const result = applied(
					makeState({
						selection: selectionOf(["o1"]),
						objects: { o1 },
					}),
					property,
					validValue,
				);
				expect(readAtPath(result.objects["o1"], path)).toBe(expected);
			});

			it(`${type} / ${property}: no-op on a shape that does not declare it (rect)`, () => {
				const o1 = {
					id: "o1",
					type: "rect",
					features: { type: "rect", geometry: "rect" },
					...parentScaffold(path),
				} as unknown as ObjectState;
				const state = makeState({
					selection: selectionOf(["o1"]),
					objects: { o1 },
				});
				expect(applied(state, property, validValue)).toBe(state);
			});

			if (path.length > 1) {
				it(`${type} / ${property}: no-op when the parent object is missing`, () => {
					const o1 = {
						id: "o1",
						type,
						features: { type, geometry: "rect" },
					} as unknown as ObjectState;
					const state = makeState({
						selection: selectionOf(["o1"]),
						objects: { o1 },
					});
					expect(applied(state, property, validValue)).toBe(state);
				});
			}
		}
	});

	describe("declaration consistency", () => {
		it("shapes declaring the same property name agree on its valueType", () => {
			const seenValueTypes = new Map<string, StyleValueType>();
			for (const { property, descriptor } of EXTRA_DECLARATIONS) {
				const seen = seenValueTypes.get(property);
				if (seen !== undefined) {
					expect(
						descriptor.valueType,
						`"${property}" is declared with conflicting valueTypes across shapes`,
					).toBe(seen);
				}
				seenValueTypes.set(property, descriptor.valueType);
			}
		});
	});
});
