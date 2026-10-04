import {
	ConnectorExtraStyleProperties,
	ConnectorFeatures,
} from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { GroupFeatures } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { PolylineFeatures } from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { ExtraStylePropertyDescriptor } from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createObjectTextVerticalBasisRegistry } from "../../../states/registry/ObjectTextVerticalBasisRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { initializeStyleProperties } from "../../registries/initializeStyleProperties";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { TEXT_SLOT_PART_KIND } from "../../selection/textSlotPartKind";
import { coreStyleTable } from "../../style/coreStyleTable";
import type { StyleIntentRegistries } from "../../style/ObjectStyleRegistry";
import { createObjectStyleRegistry } from "../../style/ObjectStyleRegistry";
import { createStylePropertyRegistry } from "../StylePropertyRegistry";

// A synthetic type with a flat (non-nested) extra property, standing in for a
// plugin-declared shape (e.g. plugins/container-shapes) to exercise the
// ExtraStyleProperty fallback's non-nested path without depending on any
// concrete built-in type declaring one (nested extras are already covered by
// connector's label.* properties below).
const EXTRA_SHAPE_TYPE = "extraShapeFixture";
const ExtraShapeFeatures = {
	type: EXTRA_SHAPE_TYPE,
	geometry: "rect",
	stroke: true,
	fill: true,
	connectable: true,
} as const satisfies ObjectFeatures;
const ExtraShapeExtraStyleProperties = {
	accentColor: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// Production-shaped registry: system handlers + the extras under test.
const styleRegistry = createStylePropertyRegistry();
initializeStyleProperties(
	styleRegistry,
	createObjectTextVerticalBasisRegistry(),
);
styleRegistry.registerExtras(EXTRA_SHAPE_TYPE, ExtraShapeExtraStyleProperties);
styleRegistry.registerExtras("connector", ConnectorExtraStyleProperties);

// The style tables the properties already moved over are answered by, wired the
// way applyObjectDefinition wires them: each fixture type's own features.
const styleRegistries: StyleIntentRegistries = {
	objectStyle: createObjectStyleRegistry(),
	objectShapeStyleDefaults: createObjectShapeStyleDefaultsRegistry(),
};
for (const features of [
	RectFeatures,
	ConnectorFeatures,
	PolylineFeatures,
	GroupFeatures,
	ExtraShapeFeatures,
]) {
	styleRegistries.objectStyle.register(features.type, coreStyleTable(features));
}

const applyStyleProperty = (
	state: CanvasControllerState,
	property: string,
	value: string,
): CanvasControllerState =>
	styleRegistry.apply(state, property, value, styleRegistries);

type MinState = Pick<
	CanvasControllerState,
	| "selection"
	| "objects"
	| "multiSelectGroup"
	| "textEditState"
	| "commitVersion"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		selection: selectionOf([]),
		objects: {},
		multiSelectGroup: null,
		textEditState: null,
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

const rectObj = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		fill: "#ffffff",
		stroke: "#000000",
		strokeWidth: 1,
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const connObj = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		features: ConnectorFeatures,
		stroke: "#000000",
		strokeWidth: 1,
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
	}) as unknown as ObjectState;

const polylineObj = (id: string): ObjectState =>
	({
		id,
		type: "polyline",
		features: PolylineFeatures,
		stroke: "#000000",
		strokeWidth: 1,
		points: [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		],
	}) as unknown as ObjectState;

const groupObj = (id: string, childIds: string[]): ObjectState =>
	({
		id,
		type: "group",
		features: GroupFeatures,
		childIds,
	}) as unknown as ObjectState;

const extraShapeObj = (id: string): ObjectState =>
	({
		id,
		type: EXTRA_SHAPE_TYPE,
		features: ExtraShapeFeatures,
		fill: "transparent",
		accentColor: "auto",
		x: 0,
		y: 0,
		width: 240,
		height: 160,
	}) as unknown as ObjectState;

describe("StylePropertyRegistry.apply (selection style updates)", () => {
	describe("nothing selected", () => {
		it("-> returns the same reference", () => {
			const state = makeState();
			expect(applyStyleProperty(state, "fill", "#ff0000")).toBe(state);
		});
	});

	describe("a connector selected", () => {
		it("supported property (stroke) -> the connector is updated", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "stroke", "#ff0000");
			const updated = result.objects["c1"] as unknown as { stroke: string };
			expect(updated.stroke).toBe("#ff0000");
		});

		it("unsupported property (fill on connector) -> returns the same reference", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			expect(applyStyleProperty(state, "fill", "#ff0000")).toBe(state);
		});

		it("object does not exist -> returns the same reference", () => {
			const state = makeState({ selection: selectionOf(["missing"]) });
			expect(applyStyleProperty(state, "stroke", "#ff0000")).toBe(state);
		});

		it("strokeWidth is converted to a number and applied", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "strokeWidth", "3");
			const updated = result.objects["c1"] as unknown as {
				strokeWidth: number;
			};
			expect(updated.strokeWidth).toBe(3);
		});

		it("non-numeric strokeWidth -> returns the same reference", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			expect(applyStyleProperty(state, "strokeWidth", "abc")).toBe(state);
		});

		it("arrow property (endArrow) -> applied via the connector's arrow feature", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "endArrow", "FilledTriangle");
			const updated = result.objects["c1"] as unknown as { endArrow: string };
			expect(updated.endArrow).toBe("FilledTriangle");
		});
	});

	describe("connector label nested styles (label.*)", () => {
		const connWithLabel = (id: string): ObjectState =>
			({
				...(connObj(id) as unknown as object),
				label: { text: "Yes" },
			}) as unknown as ObjectState;

		it("label.fill -> nested-updated on connector.label.fill", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "label.fill", "#ff0000");
			const updated = result.objects["c1"] as unknown as {
				label: { text: string; fill: string };
			};
			expect(updated.label.fill).toBe("#ff0000");
			// the existing text is preserved
			expect(updated.label.text).toBe("Yes");
		});

		it("label.stroke -> nested-updated on label.stroke", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "label.stroke", "#00ff00");
			const updated = result.objects["c1"] as unknown as {
				label: { stroke: string };
			};
			expect(updated.label.stroke).toBe("#00ff00");
		});

		it("label.strokeDashType -> nested-updated, kept as a string", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(
				state,
				"label.strokeDashType",
				"dashed",
			);
			const updated = result.objects["c1"] as unknown as {
				label: { strokeDashType: string };
			};
			expect(updated.label.strokeDashType).toBe("dashed");
		});

		it("label.fontSize is numeric-converted and updated", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "label.fontSize", "20");
			const updated = result.objects["c1"] as unknown as {
				label: { fontSize: number };
			};
			expect(updated.label.fontSize).toBe(20);
		});

		it("label.fontColor / label.fontWeight are updated, kept as strings", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const afterColor = applyStyleProperty(
				state,
				"label.fontColor",
				"#123456",
			);
			expect(
				(
					afterColor.objects["c1"] as unknown as {
						label: { fontColor: string };
					}
				).label.fontColor,
			).toBe("#123456");
			const afterBold = applyStyleProperty(state, "label.fontWeight", "bold");
			expect(
				(
					afterBold.objects["c1"] as unknown as {
						label: { fontWeight: string };
					}
				).label.fontWeight,
			).toBe("bold");
		});

		it("label.fontFamily keeps the stack it is given, commas and quotes included", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const stack = '"Source Serif 4", "Noto Serif JP", serif';
			const result = applyStyleProperty(state, "label.fontFamily", stack);
			const updated = result.objects["c1"] as unknown as {
				label: { fontFamily: string };
			};
			expect(updated.label.fontFamily).toBe(stack);
		});

		it("label.strokeWidth is numeric-converted and updated", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			const result = applyStyleProperty(state, "label.strokeWidth", "2");
			const updated = result.objects["c1"] as unknown as {
				label: { strokeWidth: number };
			};
			expect(updated.label.strokeWidth).toBe(2);
		});

		it("non-numeric label.strokeWidth -> returns the same reference", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			expect(applyStyleProperty(state, "label.strokeWidth", "x")).toBe(state);
		});

		it("label.* on a connector with no label -> returns the same reference", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			expect(applyStyleProperty(state, "label.fill", "#ff0000")).toBe(state);
		});

		it("the original objects are not mutated (immutable)", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selection: selectionOf(["c1"]),
				objects: { c1 },
			});
			applyStyleProperty(state, "label.fill", "#ff0000");
			expect(
				(c1 as unknown as { label: { fill?: string } }).label.fill,
			).toBeUndefined();
		});
	});

	describe("an object selection (the normal case)", () => {
		it("applying fill to a rect -> fill is updated", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "fill", "#123456");
			const updated = result.objects["r1"] as unknown as { fill: string };
			expect(updated.fill).toBe("#123456");
		});

		it("unsupported property -> returns the same reference", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			expect(applyStyleProperty(state, "startArrow", "triangle")).toBe(state);
		});

		it("fillOpacity is converted to a number and applied", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "fillOpacity", "0.4");
			const updated = result.objects["r1"] as unknown as {
				fillOpacity: number;
			};
			expect(updated.fillOpacity).toBe(0.4);
		});

		it("fillOpacity on a polyline -> returns the same reference, it has no fill", () => {
			const p1 = polylineObj("p1");
			const state = makeState({
				selection: selectionOf(["p1"]),
				objects: { p1 },
			});
			expect(applyStyleProperty(state, "fillOpacity", "0.4")).toBe(state);
		});

		it("strokeOpacity is converted to a number and applied", () => {
			const p1 = polylineObj("p1");
			const state = makeState({
				selection: selectionOf(["p1"]),
				objects: { p1 },
			});
			const result = applyStyleProperty(state, "strokeOpacity", "0.25");
			const updated = result.objects["p1"] as unknown as {
				strokeOpacity: number;
			};
			expect(updated.strokeOpacity).toBe(0.25);
		});

		it("arrow property on a polyline -> applied via its arrow feature", () => {
			const p1 = polylineObj("p1");
			const state = makeState({
				selection: selectionOf(["p1"]),
				objects: { p1 },
			});
			const result = applyStyleProperty(state, "startArrow", "OpenArrow");
			const updated = result.objects["p1"] as unknown as { startArrow: string };
			expect(updated.startArrow).toBe("OpenArrow");
		});

		it("arrow property propagates to arrow-capable group descendants", () => {
			const g1 = groupObj("g1", ["p1"]);
			const p1 = polylineObj("p1");
			const state = makeState({
				selection: selectionOf(["g1"]),
				objects: { g1, p1 },
			});
			const result = applyStyleProperty(state, "endArrow", "FilledTriangle");
			const updated = result.objects["p1"] as unknown as { endArrow: string };
			expect(updated.endArrow).toBe("FilledTriangle");
		});

		it("multiple selection -> all objects are updated", () => {
			const r1 = rectObj("r1");
			const r2 = rectObj("r2");
			const state = makeState({
				selection: selectionOf(["r1", "r2"]),
				objects: { r1, r2 },
			});
			const result = applyStyleProperty(state, "fill", "#abcdef");
			expect((result.objects["r1"] as unknown as { fill: string }).fill).toBe(
				"#abcdef",
			);
			expect((result.objects["r2"] as unknown as { fill: string }).fill).toBe(
				"#abcdef",
			);
		});

		it("lockAspectRatio with a multiSelectGroup present -> only multiSelectGroup is updated", () => {
			const r1 = rectObj("r1");
			const multiGroup = {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"];
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
				multiSelectGroup: multiGroup,
			});
			const result = applyStyleProperty(state, "lockAspectRatio", "false");
			expect(result.multiSelectGroup?.lockAspectRatio).toBe(false);
			// the rect itself does not change
			expect(result.objects["r1"]).toBe(r1);
		});

		it("the original objects are not mutated (immutable)", () => {
			const r1 = rectObj("r1");
			const originalFill = (r1 as unknown as { fill: string }).fill;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			applyStyleProperty(state, "fill", "#000000");
			expect((r1 as unknown as { fill: string }).fill).toBe(originalFill);
		});

		it("lockAspectRatio on a single selection -> applied to the object itself", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "lockAspectRatio", "true");
			expect(
				(result.objects["r1"] as unknown as { lockAspectRatio: boolean })
					.lockAspectRatio,
			).toBe(true);
		});

		it("lockAspectRatio does not recurse into group descendants", () => {
			const g1 = groupObj("g1", ["r1"]);
			const r1 = rectObj("r1");
			const state = makeState({
				selection: selectionOf(["g1"]),
				objects: { g1, r1 },
			});
			const result = applyStyleProperty(state, "lockAspectRatio", "true");
			// the group itself is transform-capable and is updated
			expect(
				(result.objects["g1"] as unknown as { lockAspectRatio: boolean })
					.lockAspectRatio,
			).toBe(true);
			// the child is untouched
			expect(result.objects["r1"]).toBe(r1);
		});
	});

	describe("text styling (stored per slot)", () => {
		const slotsOf = (
			state: CanvasControllerState,
			id: string,
		): Record<string, Record<string, unknown>> =>
			(
				state.objects[id] as unknown as {
					text: Record<string, Record<string, unknown>>;
				}
			).text;

		/** A rect whose single body slot carries the shape's typography. */
		const bodyRect = (id: string, style: Record<string, unknown> = {}) =>
			({
				...rectObj(id),
				text: { body: { text: "hello", ...style } },
			}) as unknown as ObjectState;

		/** A two-slot shape, standing in for a record. */
		const keyedRect = (id: string, style: Record<string, unknown> = {}) =>
			({
				...rectObj(id),
				text: {
					name: { text: "User", ...style },
					rows: { text: ["id"], ...style },
				},
			}) as unknown as ObjectState;

		it("writes into the slot rather than the object root", () => {
			const r1 = bodyRect("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "fontSize", "24");
			expect(slotsOf(result, "r1").body).toEqual({
				text: "hello",
				fontSize: 24,
			});
			expect("fontSize" in result.objects["r1"]).toBe(false);
		});

		it("writes into every slot while no single slot is selected", () => {
			const r1 = keyedRect("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "fontWeight", "bold");
			expect(slotsOf(result, "r1")).toEqual({
				name: { text: "User", fontWeight: "bold" },
				rows: { text: ["id"], fontWeight: "bold" },
			});
		});

		it("writes fontStyle and textDecoration into the slot as strings", () => {
			const r1 = bodyRect("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const italic = applyStyleProperty(state, "fontStyle", "italic");
			expect(slotsOf(italic, "r1").body).toEqual({
				text: "hello",
				fontStyle: "italic",
			});
			// The two decoration lines arrive as one space-separated value.
			const decorated = applyStyleProperty(
				state,
				"textDecoration",
				"underline line-through",
			);
			expect(slotsOf(decorated, "r1").body).toEqual({
				text: "hello",
				textDecoration: "underline line-through",
			});
		});

		it("drops the property from the runs that overrode it, so the slot's value shows", () => {
			const r1 = {
				...rectObj("r1"),
				text: {
					body: {
						text: [
							{ text: "he", fontWeight: "bold", fontColor: "#d33" },
							{ text: "llo" },
						],
					},
				},
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});

			const result = applyStyleProperty(state, "fontWeight", "normal");

			// The run keeps its color, and the text collapses back to a plain string
			// once nothing is styled on its own.
			expect(slotsOf(result, "r1").body).toEqual({
				text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }],
				fontWeight: "normal",
			});
		});

		it("drops the property from the runs of a row too", () => {
			const r1 = {
				...rectObj("r1"),
				text: {
					rows: {
						text: [
							"id",
							[{ text: "email", fontWeight: "bold", fontColor: "#d33" }],
						],
					},
				},
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});

			const result = applyStyleProperty(state, "fontWeight", "normal");

			expect(slotsOf(result, "r1").rows).toEqual({
				text: ["id", [{ text: "email", fontColor: "#d33" }]],
				fontWeight: "normal",
			});
		});

		it("lands on the selected characters while an editor is open", () => {
			const r1 = bodyRect("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
				textEditState: {
					kind: "shape",
					text: "hello",
					selection: { start: 0, end: 2 },
				},
			});

			const result = applyStyleProperty(state, "fontColor", "#d33");

			expect(slotsOf(result, "r1").body).toEqual({
				text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }],
			});
		});

		it("styles the whole slot when the editor has nothing selected", () => {
			const r1 = bodyRect("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
				textEditState: {
					kind: "shape",
					text: "hello",
					selection: { start: 2, end: 2 },
				},
			});

			const result = applyStyleProperty(state, "fontColor", "#d33");

			expect(slotsOf(result, "r1").body).toEqual({
				text: "hello",
				fontColor: "#d33",
			});
		});

		it("drops a whole-slot write's property from the open editor's draft too", () => {
			// The draft carries the same per-run overrides the slot content is being
			// stripped of; left in place, the next graft would write them back over
			// the slot and the slot-wide value would never show.
			const r1 = {
				...rectObj("r1"),
				text: {
					body: { text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }] },
				},
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
				textEditState: {
					kind: "shape",
					text: [
						{ text: "he", fontColor: "#d33", fontWeight: "bold" },
						{ text: "llo!" },
					],
					selection: { start: 2, end: 2 },
				},
			});

			const result = applyStyleProperty(state, "fontColor", "#00f");

			// The written property leaves the draft's runs; the rest of their styling
			// and the edited characters stay.
			expect(result.textEditState).toMatchObject({
				text: [{ text: "he", fontWeight: "bold" }, { text: "llo!" }],
			});
		});

		it("styles the whole slot for a property no stretch of text can carry", () => {
			const r1 = bodyRect("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
				textEditState: {
					kind: "shape",
					text: "hello",
					selection: { start: 0, end: 2 },
				},
			});

			const result = applyStyleProperty(state, "textAlign", "right");

			expect(slotsOf(result, "r1").body).toEqual({
				text: "hello",
				textAlign: "right",
			});
		});

		it("keeps the slot's content and its other styling", () => {
			const r1 = bodyRect("r1", { textAlign: "right", fontSize: 12 });
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "fontSize", "24");
			expect(slotsOf(result, "r1").body).toEqual({
				text: "hello",
				textAlign: "right",
				fontSize: 24,
			});
		});

		it("applies to every selected object and to group descendants", () => {
			const g1 = groupObj("g1", ["r2"]);
			const r1 = bodyRect("r1");
			const r2 = bodyRect("r2");
			const state = makeState({
				selection: selectionOf(["r1", "g1"]),
				objects: { g1, r1, r2 },
			});
			const result = applyStyleProperty(state, "fontColor", "#123456");
			expect(slotsOf(result, "r1").body.fontColor).toBe("#123456");
			expect(slotsOf(result, "r2").body.fontColor).toBe("#123456");
		});

		it("skips an object that holds no text at all", () => {
			const p1 = polylineObj("p1");
			const state = makeState({
				selection: selectionOf(["p1"]),
				objects: { p1 },
			});
			expect(applyStyleProperty(state, "fontSize", "24")).toBe(state);
		});

		it("does not mutate the original slots (immutable)", () => {
			const r1 = bodyRect("r1", { fontSize: 12 });
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			applyStyleProperty(state, "fontSize", "24");
			expect(slotsOf(state, "r1").body.fontSize).toBe(12);
		});

		describe("with a slot selected below the object", () => {
			/** A record-like shape: two slots, addressable one by one (features.text = "slots"). */
			const slotRect = (id: string, style: Record<string, unknown> = {}) =>
				({
					...rectObj(id),
					features: { ...RectFeatures, text: "slots" },
					text: {
						name: { text: "User", ...style },
						rows: { text: ["id"], ...style },
					},
				}) as unknown as ObjectState;

			it("writes the selected slot only, leaving the others as they were", () => {
				const r1 = slotRect("r1", { fontSize: 12 });
				const state = makeState({
					selection: selectionOf(["r1"], {
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "rows", focusId: "rows" }],
					}),
					objects: { r1 },
				});
				const result = applyStyleProperty(state, "fontSize", "24");
				expect(slotsOf(result, "r1")).toEqual({
					name: { text: "User", fontSize: 12 },
					rows: { text: ["id"], fontSize: 24 },
				});
			});

			it("does not carry the slot restriction into group descendants", () => {
				// A group that itself holds slots: synthetic, but the only way one
				// object can be both the slot's owner and a parent of descendants.
				const g1 = {
					...groupObj("g1", ["r1"]),
					features: { ...GroupFeatures, text: "slots" },
					text: { name: { text: "Group" }, rows: { text: ["a"] } },
				} as unknown as ObjectState;
				const r1 = slotRect("r1");
				const state = makeState({
					selection: selectionOf(["g1"], {
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "rows", focusId: "rows" }],
					}),
					objects: { g1, r1 },
				});
				const result = applyStyleProperty(state, "fontWeight", "bold");
				expect(slotsOf(result, "g1").name.fontWeight).toBeUndefined();
				expect(slotsOf(result, "g1").rows.fontWeight).toBe("bold");
				expect(slotsOf(result, "r1").name.fontWeight).toBe("bold");
				expect(slotsOf(result, "r1").rows.fontWeight).toBe("bold");
			});

			it("leaves the text content property writing the first slot", () => {
				const r1 = slotRect("r1");
				const state = makeState({
					selection: selectionOf(["r1"], {
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "rows", focusId: "rows" }],
					}),
					objects: { r1 },
				});
				const result = applyStyleProperty(state, "text", "Account");
				expect(slotsOf(result, "r1")).toEqual({
					name: { text: "Account" },
					rows: { text: ["id"] },
				});
			});
		});

		describe("on slots carrying their type's own fields", () => {
			// A table cell is a slot with `fill` on it, which survives a write only
			// because the write copies the slot instead of rebuilding it from the fields
			// TextSlot names (TextSlots). Narrowed to those, a style change would clear
			// every cell's background colour with nothing reporting it.
			const cellRect = (
				id: string,
				content: Record<string, unknown> = { text: "id" },
			) =>
				({
					...rectObj(id),
					features: { ...RectFeatures, text: "slots" },
					text: {
						"0_0": { ...content, fill: "#eef" },
						"0_1": { text: "name", fill: "#fee" },
					},
				}) as unknown as ObjectState;

			it("keeps them when a whole-slot property is written", () => {
				const r1 = cellRect("r1");
				const state = makeState({
					selection: selectionOf(["r1"]),
					objects: { r1 },
				});
				const result = applyStyleProperty(state, "textAlign", "center");
				expect(slotsOf(result, "r1")).toEqual({
					"0_0": { text: "id", fill: "#eef", textAlign: "center" },
					"0_1": { text: "name", fill: "#fee", textAlign: "center" },
				});
			});

			it("keeps them when an inline property strips the slot's runs", () => {
				const r1 = cellRect("r1", {
					text: [{ text: "id", fontWeight: "bold" }],
				});
				const state = makeState({
					selection: selectionOf(["r1"]),
					objects: { r1 },
				});
				const result = applyStyleProperty(state, "fontWeight", "normal");
				expect(slotsOf(result, "r1")["0_0"]).toEqual({
					text: "id",
					fill: "#eef",
					fontWeight: "normal",
				});
			});

			it("keeps them when the write lands on the selected slot alone", () => {
				const r1 = cellRect("r1");
				const state = makeState({
					selection: selectionOf(["r1"], {
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "0_1", focusId: "0_1" }],
					}),
					objects: { r1 },
				});
				const result = applyStyleProperty(state, "fontSize", "24");
				expect(slotsOf(result, "r1")).toEqual({
					"0_0": { text: "id", fill: "#eef" },
					"0_1": { text: "name", fill: "#fee", fontSize: 24 },
				});
			});
		});

		describe("on a body written in a source language", () => {
			/** A shape whose body is source text (features.text = "source"). */
			const sourceRect = (id: string, style: Record<string, unknown> = {}) =>
				({
					...rectObj(id),
					features: { ...RectFeatures, text: "source" },
					text: { body: { text: "# Title", ...style } },
				}) as unknown as ObjectState;

			/** The same shape being edited with its first two characters selected. */
			const editingSource = (r1: ObjectState): CanvasControllerState =>
				makeState({
					selection: selectionOf(["r1"]),
					objects: { r1 },
					textEditState: {
						kind: "shape",
						text: "# Title",
						selection: { start: 0, end: 2 },
					},
				});

			it("skips an emphasis property, the syntax carrying it instead", () => {
				const r1 = sourceRect("r1");
				const state = makeState({
					selection: selectionOf(["r1"]),
					objects: { r1 },
				});
				expect(applyStyleProperty(state, "fontWeight", "bold")).toBe(state);
			});

			it("writes a property the body does accept", () => {
				const r1 = sourceRect("r1");
				const state = makeState({
					selection: selectionOf(["r1"]),
					objects: { r1 },
				});
				const result = applyStyleProperty(state, "fontSize", "24");
				expect(slotsOf(result, "r1").body).toEqual({
					text: "# Title",
					fontSize: 24,
				});
			});

			it("writes the whole slot even with a stretch selected, the content staying a string", () => {
				const result = applyStyleProperty(
					editingSource(sourceRect("r1")),
					"fontSize",
					"24",
				);
				expect(slotsOf(result, "r1").body).toEqual({
					text: "# Title",
					fontSize: 24,
				});
			});

			it("styles no stretch with an emphasis property either", () => {
				const state = editingSource(sourceRect("r1"));
				expect(applyStyleProperty(state, "fontWeight", "bold")).toBe(state);
			});

			it("writes an emphasis property onto the selected objects that accept it", () => {
				const r1 = sourceRect("r1");
				const r2 = bodyRect("r2");
				const state = makeState({
					selection: selectionOf(["r1", "r2"]),
					objects: { r1, r2 },
				});
				const result = applyStyleProperty(state, "fontWeight", "bold");
				expect(slotsOf(result, "r1").body).toEqual({ text: "# Title" });
				expect(slotsOf(result, "r2").body.fontWeight).toBe("bold");
			});
		});
	});

	describe("text content property (text)", () => {
		const slotsOf = (
			state: CanvasControllerState,
			id: string,
		): Record<string, Record<string, unknown>> =>
			(
				state.objects[id] as unknown as {
					text: Record<string, Record<string, unknown>>;
				}
			).text;

		it("writes the body slot's content, keeping its styling", () => {
			const r1 = {
				...rectObj("r1"),
				text: { body: { text: "hello", fontSize: 12 } },
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "text", "world");
			expect(slotsOf(result, "r1").body).toEqual({
				text: "world",
				fontSize: 12,
			});
		});

		it("writes only the first slot of a multi-slot shape", () => {
			const r1 = {
				...rectObj("r1"),
				text: { name: { text: "User" }, rows: { text: ["id"] } },
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "text", "Account");
			expect(slotsOf(result, "r1")).toEqual({
				name: { text: "Account" },
				rows: { text: ["id"] },
			});
		});

		it("splits on newlines when the target slot holds rows", () => {
			const r1 = {
				...rectObj("r1"),
				text: { rows: { text: ["id"] } },
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			const result = applyStyleProperty(state, "text", "id\nemail");
			expect(slotsOf(result, "r1").rows).toEqual({ text: ["id", "email"] });
		});

		it("skips an object with no slot to write", () => {
			const r1 = {
				...rectObj("r1"),
				text: {},
			} as unknown as ObjectState;
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			expect(applyStyleProperty(state, "text", "world")).toBe(state);
		});
	});

	describe("shape-declared extra properties (accentColor)", () => {
		it("accentColor on the declaring shape -> applied", () => {
			const e1 = extraShapeObj("e1");
			const state = makeState({
				selection: selectionOf(["e1"]),
				objects: { e1 },
			});
			const result = applyStyleProperty(state, "accentColor", "#336699");
			expect(
				(result.objects["e1"] as unknown as { accentColor: string })
					.accentColor,
			).toBe("#336699");
		});

		it("accentColor on a rect (undeclared shape) -> returns the same reference", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selection: selectionOf(["r1"]),
				objects: { r1 },
			});
			expect(applyStyleProperty(state, "accentColor", "#336699")).toBe(state);
		});

		it("accentColor propagates to declaring-shape descendants of a selected group", () => {
			const g1 = groupObj("g1", ["e1"]);
			const e1 = extraShapeObj("e1");
			const state = makeState({
				selection: selectionOf(["g1"]),
				objects: { g1, e1 },
			});
			const result = applyStyleProperty(state, "accentColor", "#112233");
			expect(
				(result.objects["e1"] as unknown as { accentColor: string })
					.accentColor,
			).toBe("#112233");
		});

		it("a completely unknown property -> returns the same reference", () => {
			const e1 = extraShapeObj("e1");
			const state = makeState({
				selection: selectionOf(["e1"]),
				objects: { e1 },
			});
			expect(applyStyleProperty(state, "notAProperty", "x")).toBe(state);
		});
	});
});
