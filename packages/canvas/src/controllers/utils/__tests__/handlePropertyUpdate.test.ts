import { describe, it, expect } from "vitest";

import { ConnectorFeatures } from "../../../schemas/objects/connections/connector/ConnectorDoc";
import { GroupFeatures } from "../../../schemas/objects/primitives/group/GroupDoc";
import { PolylineFeatures } from "../../../schemas/objects/primitives/polyline/PolylineDoc";
import { RectFeatures } from "../../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { handlePropertyUpdate } from "../handlePropertyUpdate";

type MinState = Pick<
	CanvasControllerState,
	"selectedIds" | "selectedConnectorId" | "objects" | "multiSelectGroup"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		selectedIds: [],
		selectedConnectorId: null,
		objects: {},
		multiSelectGroup: null,
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

describe("handlePropertyUpdate", () => {
	describe("selectedIds is empty and selectedConnectorId is null", () => {
		it("-> returns the same reference", () => {
			const state = makeState();
			expect(handlePropertyUpdate(state, "fill", "#ff0000")).toBe(state);
		});
	});

	describe("selectedConnectorId present (connector selected)", () => {
		it("supported property (stroke) -> the connector is updated", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "stroke", "#ff0000");
			const updated = result.objects["c1"] as unknown as { stroke: string };
			expect(updated.stroke).toBe("#ff0000");
		});

		it("unsupported property (fill on connector) -> returns the same reference", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "fill", "#ff0000")).toBe(state);
		});

		it("object does not exist -> returns the same reference", () => {
			const state = makeState({ selectedConnectorId: "missing" });
			expect(handlePropertyUpdate(state, "stroke", "#ff0000")).toBe(state);
		});

		it("strokeWidth is converted to a number and applied", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "strokeWidth", "3");
			const updated = result.objects["c1"] as unknown as {
				strokeWidth: number;
			};
			expect(updated.strokeWidth).toBe(3);
		});

		it("non-numeric strokeWidth -> returns the same reference", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "strokeWidth", "abc")).toBe(state);
		});

		it("arrow property (endArrow) -> applied via the connector's arrow feature", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "endArrow", "FilledTriangle");
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
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.fill", "#ff0000");
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
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.stroke", "#00ff00");
			const updated = result.objects["c1"] as unknown as {
				label: { stroke: string };
			};
			expect(updated.label.stroke).toBe("#00ff00");
		});

		it("label.strokeDashType -> nested-updated, kept as a string", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(
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
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.fontSize", "20");
			const updated = result.objects["c1"] as unknown as {
				label: { fontSize: number };
			};
			expect(updated.label.fontSize).toBe(20);
		});

		it("label.fontColor / label.fontWeight are updated, kept as strings", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const afterColor = handlePropertyUpdate(
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
			const afterBold = handlePropertyUpdate(state, "label.fontWeight", "bold");
			expect(
				(
					afterBold.objects["c1"] as unknown as {
						label: { fontWeight: string };
					}
				).label.fontWeight,
			).toBe("bold");
		});

		it("label.strokeWidth is numeric-converted and updated", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			const result = handlePropertyUpdate(state, "label.strokeWidth", "2");
			const updated = result.objects["c1"] as unknown as {
				label: { strokeWidth: number };
			};
			expect(updated.label.strokeWidth).toBe(2);
		});

		it("non-numeric label.strokeWidth -> returns the same reference", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "label.strokeWidth", "x")).toBe(state);
		});

		it("label.* on a connector with no label -> returns the same reference", () => {
			const c1 = connObj("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			expect(handlePropertyUpdate(state, "label.fill", "#ff0000")).toBe(state);
		});

		it("the original objects are not mutated (immutable)", () => {
			const c1 = connWithLabel("c1");
			const state = makeState({
				selectedConnectorId: "c1",
				objects: { c1 },
			});
			handlePropertyUpdate(state, "label.fill", "#ff0000");
			expect(
				(c1 as unknown as { label: { fill?: string } }).label.fill,
			).toBeUndefined();
		});
	});

	describe("selectedIds present (normal selection)", () => {
		it("applying fill to a rect -> fill is updated", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1 },
			});
			const result = handlePropertyUpdate(state, "fill", "#123456");
			const updated = result.objects["r1"] as unknown as { fill: string };
			expect(updated.fill).toBe("#123456");
		});

		it("unsupported property -> returns the same reference", () => {
			const r1 = rectObj("r1");
			const state = makeState({
				selectedIds: ["r1"],
				objects: { r1 },
			});
			expect(handlePropertyUpdate(state, "startArrow", "triangle")).toBe(state);
		});

		it("arrow property on a polyline -> applied via its arrow feature", () => {
			const p1 = polylineObj("p1");
			const state = makeState({
				selectedIds: ["p1"],
				objects: { p1 },
			});
			const result = handlePropertyUpdate(state, "startArrow", "OpenArrow");
			const updated = result.objects["p1"] as unknown as { startArrow: string };
			expect(updated.startArrow).toBe("OpenArrow");
		});

		it("arrow property propagates to arrow-capable group descendants", () => {
			const g1 = groupObj("g1", ["p1"]);
			const p1 = polylineObj("p1");
			const state = makeState({
				selectedIds: ["g1"],
				objects: { g1, p1 },
			});
			const result = handlePropertyUpdate(state, "endArrow", "FilledTriangle");
			const updated = result.objects["p1"] as unknown as { endArrow: string };
			expect(updated.endArrow).toBe("FilledTriangle");
		});

		it("multiple selection -> all objects are updated", () => {
			const r1 = rectObj("r1");
			const r2 = rectObj("r2");
			const state = makeState({
				selectedIds: ["r1", "r2"],
				objects: { r1, r2 },
			});
			const result = handlePropertyUpdate(state, "fill", "#abcdef");
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
				selectedIds: ["r1"],
				objects: { r1 },
				multiSelectGroup: multiGroup,
			});
			const result = handlePropertyUpdate(state, "lockAspectRatio", "false");
			expect(result.multiSelectGroup?.lockAspectRatio).toBe(false);
			// the rect itself does not change
			expect(result.objects["r1"]).toBe(r1);
		});

		it("the original objects are not mutated (immutable)", () => {
			const r1 = rectObj("r1");
			const originalFill = (r1 as unknown as { fill: string }).fill;
			const state = makeState({ selectedIds: ["r1"], objects: { r1 } });
			handlePropertyUpdate(state, "fill", "#000000");
			expect((r1 as unknown as { fill: string }).fill).toBe(originalFill);
		});
	});
});
