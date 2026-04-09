import { describe, expect, it } from "vitest";

import type { GroupDoc } from "../../../../../schemas/objects/primitives/GroupDoc";
import type { RectDoc } from "../../../../../schemas/objects/primitives/RectDoc";
import { groupToDoc, groupToState } from "../../../../../states/objects/primitives/group/GroupMapper";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";

describe("GroupMapper", () => {
	// Note: GroupMapper no longer handles recursive children mapping.
	// It initializes 'children' as an empty array, delegating structure building to CanvasMapper.

	describe("groupToState", () => {
		it("should convert GroupDoc to GroupState without children", () => {
			const childDoc: RectDoc = {
				id: "rect-1",
				type: "rect",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
			} as unknown as RectDoc;

			const doc: GroupDoc = {
				id: "group-1",
				type: "group",
				rotation: 45,
				flipX: true,
				flipY: false,
				children: [childDoc], // Has children
			} as unknown as GroupDoc;

			const state = groupToState(doc);

			expect(state.id).toBe("group-1");
			expect(state.type).toBe("group");
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1); // flipY = false

			// Verify structural normalization behavior
			expect(state.childIds).toEqual([]);
		});
	});

	describe("groupToDoc", () => {
		it("should convert GroupState to GroupDoc without children", () => {
			const state: GroupState = {
				id: "group-1",
				type: "group",
				rotation: 45,
				scaleX: -1,
				scaleY: 1,
				childIds: ["rect-1"], // Has child IDs
			} as unknown as GroupState;

			const doc = groupToDoc(state);

			expect(doc.id).toBe("group-1");
			expect(doc.type).toBe("group");
			expect(doc.rotation).toBe(45);
			expect(doc.flipX).toBe(true);
			expect(doc.flipY).toBeUndefined();

			// Verify structural denormalization behavior
			expect(doc.children).toEqual([]);
		});
	});
});
