import { describe, expect, it, beforeEach } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { GroupDoc } from "../../../schemas/objects/primitives/group/GroupDoc";
import type { RectDoc } from "../../../schemas/objects/primitives/rect/RectDoc";
import {
	canvasToState,
	canvasToDoc,
} from "../../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import {
	connectorToState,
	connectorToDoc,
} from "../../../states/objects/connections/connector/ConnectorMapper";
import {
	groupToState,
	groupToDoc,
} from "../../../states/objects/primitives/group/GroupMapper";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import {
	rectToState,
	rectToDoc,
} from "../../../states/objects/primitives/rect/RectMapper";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import { createObjectMapperRegistry } from "../../../states/registry/ObjectMapperRegistry";

describe("CanvasMapper", () => {
	const objectMapperRegistry = createObjectMapperRegistry();
	// None of the types below derive their box, so this stays empty on purpose.
	const contentResizerRegistry = createObjectContentResizerRegistry();

	// Register mappers before tests
	beforeEach(() => {
		objectMapperRegistry.clear();
		objectMapperRegistry.register(
			"group",
			{ toState: groupToState, toDoc: groupToDoc },
			{ type: "group", geometry: "none", transform: true },
		);
		objectMapperRegistry.register(
			"rect",
			{ toState: rectToState, toDoc: rectToDoc },
			{
				type: "rect",
				geometry: "rect",
				transform: true,
				stroke: true,
				fill: true,
			},
		);
		objectMapperRegistry.register(
			"connector",
			{ toState: connectorToState, toDoc: connectorToDoc },
			{ type: "connector", geometry: "poly", stroke: true },
		);
	});

	const createRectDoc = (id: string, x = 0, y = 0): RectDoc =>
		({
			id,
			type: "rect",
			x,
			y,
			width: 10,
			height: 10,
			rotation: 0,
			flipX: false,
			flipY: false,
		}) as unknown as RectDoc;

	const createGroupDoc = (id: string, children: ObjectDoc[] = []): GroupDoc =>
		({
			id,
			type: "group",
			rotation: 0,
			flipX: false,
			flipY: false,
			children,
		}) as unknown as GroupDoc;

	const createConnectorDoc = (
		id: string,
		source: unknown,
		target: unknown,
	): ObjectDoc =>
		({
			id,
			type: "connector",
			points: [],
			source,
			target,
		}) as unknown as ObjectDoc;

	const ownedRef = (rectId: string): unknown => ({
		owner: { id: rectId },
		anchor: { kind: "center" },
	});

	describe("connectors (unified z-order)", () => {
		it("preserves the z-order of root objects and connectors in canvasToState", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					createRectDoc("rect-1"),
					createConnectorDoc("conn-1", ownedRef("rect-1"), ownedRef("rect-2")),
					createRectDoc("rect-2"),
				],
			} as unknown as CanvasDoc;

			const state = canvasToState(
				doc,
				objectMapperRegistry,
				contentResizerRegistry,
			);
			expect(state.rootIds).toEqual(["rect-1", "conn-1", "rect-2"]);
			expect(state.objects["conn-1"].type).toBe("connector");
		});

		it("preserves root order (with connectors mixed in) across a canvasToState → canvasToDoc round trip", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [
					createRectDoc("rect-1"),
					createConnectorDoc("conn-1", ownedRef("rect-1"), ownedRef("rect-2")),
					createRectDoc("rect-2"),
				],
			} as unknown as CanvasDoc;

			const roundTripped = canvasToDoc(
				canvasToState(doc, objectMapperRegistry, contentResizerRegistry),
				objectMapperRegistry,
			);
			expect(roundTripped.root.map((o) => o.id)).toEqual([
				"rect-1",
				"conn-1",
				"rect-2",
			]);
			expect(roundTripped.root[1].type).toBe("connector");
		});

		it("carries a doc-authored background through the round trip", () => {
			const doc: CanvasDoc = {
				version: 1,
				background: "#0f172a",
				root: [createRectDoc("rect-1")],
			} as unknown as CanvasDoc;

			const state = canvasToState(
				doc,
				objectMapperRegistry,
				contentResizerRegistry,
			);
			expect(state.background).toBe("#0f172a");

			const roundTripped = canvasToDoc(state, objectMapperRegistry);
			expect(roundTripped.background).toBe("#0f172a");
		});

		it("omits background when the doc has none (absent = follow theme)", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [createRectDoc("rect-1")],
			} as unknown as CanvasDoc;

			const roundTripped = canvasToDoc(
				canvasToState(doc, objectMapperRegistry, contentResizerRegistry),
				objectMapperRegistry,
			);
			expect("background" in roundTripped).toBe(false);
		});
	});

	describe("canvasToState", () => {
		it("should normalize a nested tree structure into a flat map", () => {
			// Structure:
			// Root
			//  |- Rect1
			//  |- Group1
			//      |- Rect2
			//      |- Group2
			//          |- Rect3

			const rect1 = createRectDoc("rect-1");
			const rect2 = createRectDoc("rect-2");
			const rect3 = createRectDoc("rect-3");
			const group2 = createGroupDoc("group-2", [rect3]);
			const group1 = createGroupDoc("group-1", [rect2, group2]);

			const canvasDoc: CanvasDoc = {
				version: 1,
				root: [rect1, group1],
			};

			const state = canvasToState(
				canvasDoc,
				objectMapperRegistry,
				contentResizerRegistry,
			);

			// Check initial viewport
			expect(state.viewport).toEqual({
				minX: 0,
				minY: 0,
				width: 1000,
				height: 800,
				zoom: 1,
			});

			// Check flat map completeness
			expect(Object.keys(state.objects)).toHaveLength(5);
			expect(state.objects["rect-1"]).toBeDefined();
			expect(state.objects["rect-2"]).toBeDefined();
			expect(state.objects["rect-3"]).toBeDefined();
			expect(state.objects["group-1"]).toBeDefined();
			expect(state.objects["group-2"]).toBeDefined();

			// Check root hierarchy
			expect(state.rootIds).toHaveLength(2);
			expect(state.rootIds).toContain("rect-1");
			expect(state.rootIds).toContain("group-1");

			// Check parent-child relationships (Graph)
			const g1 = state.objects["group-1"] as GroupState;
			expect(g1.childIds).toHaveLength(2);
			expect(g1.childIds[0]).toBe("rect-2");
			expect(g1.childIds[1]).toBe("group-2");

			const g2 = state.objects["group-2"] as GroupState;
			expect(g2.childIds).toHaveLength(1);
			expect(g2.childIds[0]).toBe("rect-3");

			// Check parent references (Back pointers)
			expect(state.objects["rect-1"].parentId).toBeUndefined();
			expect(state.objects["group-1"].parentId).toBeUndefined();
			expect(state.objects["rect-2"].parentId).toBe("group-1");
			expect(state.objects["group-2"].parentId).toBe("group-1");
			expect(state.objects["rect-3"].parentId).toBe("group-2");
		});
	});

	describe("canvasToDoc", () => {
		it("should reconstruct a nested tree structure from a flat map", () => {
			// Simulate the state created in the previous test
			const state: CanvasState = {
				rootIds: ["rect-1", "group-1"],
				viewport: {
					minX: 0,
					minY: 0,
					width: 1000,
					height: 800,
					zoom: 1,
				},
				objects: {
					"rect-1": {
						id: "rect-1",
						type: "rect",
						parentId: undefined,
						cx: 5,
						cy: 5,
						width: 10,
						height: 10,
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
					} as unknown as ObjectState,
					"group-1": {
						id: "group-1",
						type: "group",
						parentId: undefined,
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
						childIds: ["rect-2", "group-2"],
					} as unknown as ObjectState,
					"rect-2": {
						id: "rect-2",
						type: "rect",
						parentId: "group-1",
						cx: 5,
						cy: 5,
						width: 10,
						height: 10,
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
					} as unknown as ObjectState,
					"group-2": {
						id: "group-2",
						type: "group",
						parentId: "group-1",
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
						childIds: ["rect-3"],
					} as unknown as ObjectState,
					"rect-3": {
						id: "rect-3",
						type: "rect",
						parentId: "group-2",
						cx: 5,
						cy: 5,
						width: 10,
						height: 10,
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
					} as unknown as ObjectState,
				},
			};

			const doc = canvasToDoc(state, objectMapperRegistry);

			expect(doc.root).toHaveLength(2);
			const r1 = doc.root[0] as RectDoc;
			const g1 = doc.root[1] as GroupDoc;

			expect(r1.id).toBe("rect-1");
			expect(g1.id).toBe("group-1");

			expect(g1.children).toHaveLength(2);
			const r2 = g1.children[0] as RectDoc;
			const g2 = g1.children[1] as GroupDoc;

			expect(r2.id).toBe("rect-2");
			expect(g2.id).toBe("group-2");

			expect(g2.children).toHaveLength(1);
			const r3 = g2.children[0] as RectDoc;
			expect(r3.id).toBe("rect-3");
		});
	});
});
