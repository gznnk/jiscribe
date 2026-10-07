import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { StyleValueType } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { BUILTIN_OBJECT_DEFINITIONS } from "../../../../../registries/applyObjectDefinition";
import { createTestRegistries } from "../../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../../selection/__tests__/support/vertexPartSelection";
import {
	connectorOf,
	groupOf,
	rectOf,
} from "../../../../../style/__tests__/support/styleFixtures";
import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { applyStylePropertyPart } from "../applyStylePropertyPart";
import { parseMenuPart, setPart } from "../menuParts";

const registries = createTestRegistries();

const makeState = (): CanvasControllerState =>
	({
		registries,
		objects: {
			"rect-1": {
				id: "rect-1",
				type: "rect",
				features: RectFeatures,
				cx: 0,
				cy: 0,
				width: 100,
				height: 50,
				fill: "#ffffff",
				strokeWidth: 1,
			} as unknown as ObjectState,
		},
		rootIds: ["rect-1"],
		selection: selectionOf(["rect-1"], vertexPartSelection(0)),
		multiSelectGroup: null,
		textEditState: null,
		commitVersion: 5,
	}) as unknown as CanvasControllerState;

type EventType =
	"pressed" | "click" | "doubleClick" | "dragStart" | "drag" | "dragEnd";

const apply = (
	state: CanvasControllerState,
	type: EventType,
	targetPart: string | undefined,
	inputValue?: string,
) =>
	applyStylePropertyPart(
		state,
		{ type, targetPart, inputValue } as unknown as CanvasEvent,
		parseMenuPart(targetPart),
		registries,
	);

/** The fixture rect's two styled fields, read out of a result state. */
const styledFieldsOf = (state: CanvasControllerState | null) =>
	state?.objects["rect-1"] as unknown as { fill: string; strokeWidth: number };

describe("applyStylePropertyPart", () => {
	it("leaves every part that is not a style write to the caller", () => {
		const state = makeState();
		for (const part of [
			undefined,
			"panel",
			"command:group",
			"toggle:style",
			"doc:view.open:fit-all",
		]) {
			expect(apply(state, "click", part)).toBeNull();
		}
	});

	describe("set:", () => {
		it.each(["click", "doubleClick"] as const)(
			"a %s writes the value, bumps commitVersion and keeps the part selection",
			(type) => {
				const next = apply(makeState(), type, "set:fill:#dc2626");
				expect(styledFieldsOf(next).fill).toBe("#dc2626");
				expect(next?.commitVersion).toBe(6);
				// Styling renumbers nothing, so what is picked below the object stays
				// picked — the swatch next pressed goes to the same part.
				expect(next?.selection.part).toEqual(vertexPartSelection(0));
			},
		);

		it.each(["pressed", "dragStart", "drag", "dragEnd"] as const)(
			"a %s returns the state untouched",
			(type) => {
				const state = makeState();
				expect(apply(state, type, "set:fill:#dc2626")).toBe(state);
			},
		);
	});

	describe("slider:", () => {
		it.each(["pressed", "dragStart", "drag"] as const)(
			"a %s previews the value without bumping commitVersion",
			(type) => {
				const next = apply(makeState(), type, "slider:strokeWidth", "4");
				expect(styledFieldsOf(next).strokeWidth).toBe(4);
				expect(next?.commitVersion).toBe(5);
				expect(next?.selection.part).toEqual(vertexPartSelection(0));
			},
		);

		it.each(["dragEnd", "click", "doubleClick"] as const)(
			"a %s commits the value (commitVersion bumped)",
			(type) => {
				const next = apply(makeState(), type, "slider:strokeWidth", "6");
				expect(styledFieldsOf(next).strokeWidth).toBe(6);
				expect(next?.commitVersion).toBe(6);
				expect(next?.selection.part).toEqual(vertexPartSelection(0));
			},
		);

		it("warns and changes nothing without an input value or a property", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const state = makeState();
			expect(apply(state, "drag", "slider:strokeWidth")).toBe(state);
			expect(apply(state, "drag", "slider:", "4")).toBe(state);
			expect(warnSpy).toHaveBeenCalledTimes(2);
			warnSpy.mockRestore();
		});
	});

	// The `set:` part is the one route that still carries a property name and a
	// string, so the cases that used to guard the boundary function live here: what
	// the pair of styleIntentOf and applyStyleIntent reaches, and what it leaves
	// alone. A `set:` click always returns a new state (commitVersion is bumped),
	// so "nothing was written" is read off `objects` keeping its reference.
	describe("what the intent a part states reaches", () => {
		type MinState = Pick<
			CanvasControllerState,
			"selection" | "objects" | "multiSelectGroup" | "textEditState"
		>;

		const stateOf = (
			overrides: Partial<MinState> = {},
		): CanvasControllerState =>
			({
				selection: selectionOf([]),
				objects: {},
				multiSelectGroup: null,
				textEditState: null,
				commitVersion: 0,
				...overrides,
			}) as unknown as CanvasControllerState;

		const written = (
			state: CanvasControllerState,
			property: string,
			value: string,
		): CanvasControllerState["objects"] =>
			apply(state, "click", setPart(property, value))?.objects ?? {};

		describe("the engine's own vocabulary reaches the style tables", () => {
			it("fill lands on a type that takes it", () => {
				const a = rectOf("a", { fill: "#fff" });
				const objects = written(
					stateOf({ selection: selectionOf(["a"]), objects: { a } }),
					"fill",
					"#123456",
				);
				expect((objects["a"] as unknown as { fill: string }).fill).toBe(
					"#123456",
				);
			});

			it("fill on a type that does not take it writes nothing", () => {
				const c = connectorOf("c");
				const state = stateOf({
					selection: selectionOf(["c"]),
					objects: { c },
				});
				expect(written(state, "fill", "#123456")).toBe(state.objects);
			});

			it("a number property is read as one", () => {
				const c = connectorOf("c");
				const objects = written(
					stateOf({ selection: selectionOf(["c"]), objects: { c } }),
					"strokeWidth",
					"3",
				);
				expect(
					(objects["c"] as unknown as { strokeWidth: number }).strokeWidth,
				).toBe(3);
			});

			it("a string no number can be made of writes nothing", () => {
				const c = connectorOf("c");
				const state = stateOf({
					selection: selectionOf(["c"]),
					objects: { c },
				});
				expect(written(state, "strokeWidth", "abc")).toBe(state.objects);
			});

			it("a basis that is neither of the two throws rather than writing", () => {
				const a = rectOf("a");
				const state = stateOf({
					selection: selectionOf(["a"]),
					objects: { a },
				});
				expect(() => written(state, "textVerticalBasis", "middle")).toThrow(
					/textVerticalBasis/,
				);
			});
		});

		describe("a name the vocabulary does not own is a shape's own declaration", () => {
			it("a declared name lands on the declaring shape", () => {
				const c = connectorOf("c", { label: { text: "Yes" } });
				const objects = written(
					stateOf({ selection: selectionOf(["c"]), objects: { c } }),
					"label.fill",
					"#ff0000",
				);
				expect(
					(objects["c"] as unknown as { label: { fill: string } }).label.fill,
				).toBe("#ff0000");
			});

			it("a declared name reaches declaring descendants of a selected group", () => {
				const g = groupOf("g", ["c"]);
				const c = connectorOf("c", { label: { text: "Yes" } });
				const objects = written(
					stateOf({ selection: selectionOf(["g"]), objects: { g, c } }),
					"label.fill",
					"#112233",
				);
				expect(
					(objects["c"] as unknown as { label: { fill: string } }).label.fill,
				).toBe("#112233");
			});

			it("a name nobody declares applies to nothing", () => {
				const a = rectOf("a");
				const state = stateOf({
					selection: selectionOf(["a"]),
					objects: { a },
				});
				expect(written(state, "notAProperty", "x")).toBe(state.objects);
			});

			it("nothing selected writes nothing", () => {
				const state = stateOf();
				expect(written(state, "label.fill", "#ff0000")).toBe(state.objects);
			});
		});

		describe("every built-in declaration (registry-driven)", () => {
			const VALID_INPUT: Record<StyleValueType, string> = {
				string: "test-value",
				number: "7",
				boolean: "true",
			};

			const EXPECTED_OUTPUT: Record<StyleValueType, string | number | boolean> =
				{
					string: "test-value",
					number: 7,
					boolean: true,
				};

			/** Every shape-declared extra property wired via BUILTIN_OBJECT_DEFINITIONS. */
			const EXTRA_DECLARATIONS = Object.entries(
				BUILTIN_OBJECT_DEFINITIONS,
			).flatMap(([type, definition]) =>
				Object.entries(definition.extraStyleProperties ?? {}).map(
					([property, descriptor]) => ({ type, property, descriptor }),
				),
			);

			/** Pre-creates the parent chain for a dot-path property ("label.fill" → { label: {} }). */
			const parentScaffold = (
				path: readonly string[],
			): Record<string, unknown> => {
				if (path.length <= 1) {
					return {};
				}
				const [head, ...rest] = path;
				return { [head]: parentScaffold(rest) };
			};

			const readAtPath = (object: unknown, path: readonly string[]): unknown =>
				path.reduce(
					(parent, key) =>
						(parent as Record<string, unknown> | undefined)?.[key],
					object,
				);

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
					const objects = written(
						stateOf({ selection: selectionOf(["o1"]), objects: { o1 } }),
						property,
						validValue,
					);
					expect(readAtPath(objects["o1"], path)).toBe(expected);
				});

				it(`${type} / ${property}: no-op on a shape that does not declare it (rect)`, () => {
					const o1 = {
						id: "o1",
						type: "rect",
						features: { type: "rect", geometry: "rect" },
						...parentScaffold(path),
					} as unknown as ObjectState;
					const state = stateOf({
						selection: selectionOf(["o1"]),
						objects: { o1 },
					});
					expect(written(state, property, validValue)).toBe(state.objects);
				});

				if (path.length > 1) {
					it(`${type} / ${property}: no-op when the parent object is missing`, () => {
						const o1 = {
							id: "o1",
							type,
							features: { type, geometry: "rect" },
						} as unknown as ObjectState;
						const state = stateOf({
							selection: selectionOf(["o1"]),
							objects: { o1 },
						});
						expect(written(state, property, validValue)).toBe(state.objects);
					});
				}
			}

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
});
