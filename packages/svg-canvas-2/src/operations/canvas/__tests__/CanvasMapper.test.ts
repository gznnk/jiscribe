import { describe, expect, it, beforeEach } from "vitest";

import { objectRegistry } from "../../../registry/ObjectRegistry";
import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { GroupDoc } from "../../../schemas/objects/primitives/GroupDoc";
import type { RectDoc } from "../../../schemas/objects/primitives/RectDoc";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";
import {
	groupToState,
	groupToDoc,
} from "../../objects/primitives/Group/GroupMapper";
import {
	rectToState,
	rectToDoc,
} from "../../objects/primitives/Rect/RectMapper";
import { canvasToState, canvasToDoc } from "../CanvasMapper";

describe("CanvasMapper", () => {
	// Register mappers before tests
	beforeEach(() => {
		objectRegistry.register("group", {
			mapper: { toState: groupToState, toDoc: groupToDoc },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			component: () => null as any, // Dummy component
		});
		objectRegistry.register("rect", {
			mapper: { toState: rectToState, toDoc: rectToDoc },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			component: () => null as any, // Dummy component
		});
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
				root: [rect1, group1],
				connectors: [],
			};

			const state = canvasToState(canvasDoc);

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
				connectorIds: [],
				selectedIds: [],
				dragging: null,
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

			const doc = canvasToDoc(state);

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
