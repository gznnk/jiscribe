import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
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
import { applyStyleAction } from "../applyStyleAction";
import { parseMenuAction, setAction } from "../menuActions";

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
	targetAction: string | undefined,
	inputValue?: string,
) =>
	applyStyleAction(
		state,
		{ type, targetAction, inputValue } as unknown as CanvasEvent,
		parseMenuAction(targetAction),
		registries,
	);

/** The fixture rect's two styled fields, read out of a result state. */
const styledFieldsOf = (state: CanvasControllerState | null) =>
	state?.objects["rect-1"] as unknown as { fill: string; strokeWidth: number };

describe("applyStyleAction", () => {
	it("leaves every action that is not a style write to the caller", () => {
		const state = makeState();
		for (const action of [
			undefined,
			"panel",
			"command:group",
			"toggle:style",
			"doc:view.open:fit-all",
		]) {
			expect(apply(state, "click", action)).toBeNull();
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

	// The `set:` action is the one route that still carries a property name and a
	// string, so the cases that used to guard the boundary function live here: what
	// the pair of styleIntentOf and applyStyleIntent reaches, and what it leaves
	// alone. A `set:` click always returns a new state (commitVersion is bumped),
	// so "nothing was written" is read off `objects` keeping its reference.
	describe("what the intent an action states reaches", () => {
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
			apply(state, "click", setAction(property, value))?.objects ?? {};

		describe("the core vocabulary reaches the style tables", () => {
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

		describe("every declared style entry (registry-driven)", () => {
			/**
			 * Every kind a built-in type declares in its own table, with the fields
			 * the entry writes (StyleEntry.fields) — the real bundle wiring, so a new
			 * declaration is covered without this suite being touched.
			 */
			const DECLARED_ENTRIES = Object.entries(
				BUILTIN_OBJECT_DEFINITIONS,
			).flatMap(([type, definition]) =>
				Object.entries(definition.styleEntries ?? {}).map(([kind, entry]) => ({
					type,
					kind,
					fields: entry?.fields ?? [],
				})),
			);

			/**
			 * A string every declared type reads as a value of its own: a number parses
			 * from it, and the other two take any string. What each type reads it as is
			 * the entry's own business (fieldEntry's suite), so what is checked here is
			 * that the action reached the entry at all.
			 */
			const PROBE_VALUE = "7";

			/** Pre-creates the parent chain for a dot-path kind ("label.fill" → { label: {} }). */
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

			it("the wiring exposes at least one declared entry (e.g. connector label.*)", () => {
				expect(DECLARED_ENTRIES.length).toBeGreaterThan(0);
			});

			for (const { type, kind, fields } of DECLARED_ENTRIES) {
				const path = kind.split(".");

				it(`${type} / ${kind}: lands on the declaring shape, in the field the entry states`, () => {
					const o1 = {
						id: "o1",
						type,
						features: { type, geometry: "rect" },
						...parentScaffold(path),
					} as unknown as ObjectState;
					const objects = written(
						stateOf({ selection: selectionOf(["o1"]), objects: { o1 } }),
						kind,
						PROBE_VALUE,
					);
					expect(readAtPath(objects["o1"], path)).toBeDefined();
					// What the entry writes is what it said it would (the registration
					// check holds the other half: that the type's doc may hold it).
					expect(fields).toEqual([path[0]]);
				});

				it(`${type} / ${kind}: no-op on a shape that does not declare it (rect)`, () => {
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
					expect(written(state, kind, PROBE_VALUE)).toBe(state.objects);
				});

				if (path.length > 1) {
					it(`${type} / ${kind}: no-op when the parent object is missing`, () => {
						const o1 = {
							id: "o1",
							type,
							features: { type, geometry: "rect" },
						} as unknown as ObjectState;
						const state = stateOf({
							selection: selectionOf(["o1"]),
							objects: { o1 },
						});
						expect(written(state, kind, PROBE_VALUE)).toBe(state.objects);
					});
				}
			}
		});
	});
});
