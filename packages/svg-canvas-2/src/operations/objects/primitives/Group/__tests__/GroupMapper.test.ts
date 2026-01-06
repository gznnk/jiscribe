import { describe, expect, it } from "vitest";

import type { GroupDoc } from "../../../../../schemas/objects/primitives/GroupDoc";
import type { RectDoc } from "../../../../../schemas/objects/primitives/RectDoc";
import type { GroupState } from "../../../../../states/objects/primitives/GroupState";
import type { RectState } from "../../../../../states/objects/primitives/RectState";
import { groupToDoc, groupToState } from "../GroupMapper";

describe("GroupMapper", () => {
	describe("groupToState", () => {
		it("should convert GroupDoc to GroupState with all properties", () => {
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
				children: [childDoc],
			} as unknown as GroupDoc;

			const state = groupToState(doc);

			expect(state.id).toBe("group-1");
			expect(state.type).toBe("group");
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1); // flipY = false
			expect(state.children).toHaveLength(1);
			expect(state.children[0].id).toBe("rect-1");
			expect(state.children[0].type).toBe("rect");
		});

		it("should handle default transform values", () => {
			const doc: GroupDoc = {
				id: "group-2",
				type: "group",
				children: [],
			} as unknown as GroupDoc;

			const state = groupToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});

		it("should convert nested children correctly", () => {
			const rect1: RectDoc = {
				id: "rect-1",
				type: "rect",
				x: 0,
				y: 0,
				width: 50,
				height: 50,
			} as unknown as RectDoc;

			const rect2: RectDoc = {
				id: "rect-2",
				type: "rect",
				x: 50,
				y: 50,
				width: 50,
				height: 50,
			} as unknown as RectDoc;

			const doc: GroupDoc = {
				id: "group-3",
				type: "group",
				children: [rect1, rect2],
			} as unknown as GroupDoc;

			const state = groupToState(doc);

			expect(state.children).toHaveLength(2);
			expect(state.children[0].id).toBe("rect-1");
			expect(state.children[1].id).toBe("rect-2");
		});
	});

	describe("groupToDoc", () => {
		it("should convert GroupState to GroupDoc with all properties", () => {
			const childState: RectState = {
				id: "rect-1",
				type: "rect",
				cx: 50,
				cy: 50,
				width: 100,
				height: 100,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as RectState;

			const state: GroupState = {
				id: "group-1",
				type: "group",
				rotation: 45,
				scaleX: -1,
				scaleY: 1,
				children: [childState],
			} as unknown as GroupState;

			const doc = groupToDoc(state);

			expect(doc.id).toBe("group-1");
			expect(doc.type).toBe("group");
			expect(doc.rotation).toBe(45);
			expect(doc.flipX).toBe(true); // scaleX < 0
			expect(doc.flipY).toBeUndefined(); // scaleY >= 0
			expect(doc.children).toHaveLength(1);
			expect(doc.children[0].id).toBe("rect-1");
			expect(doc.children[0].type).toBe("rect");
		});

		it("should omit default transform values", () => {
			const state: GroupState = {
				id: "group-2",
				type: "group",
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				children: [],
			} as unknown as GroupState;

			const doc = groupToDoc(state);

			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBeUndefined();
		});

		it("should convert nested children correctly", () => {
			const rect1: RectState = {
				id: "rect-1",
				type: "rect",
				cx: 25,
				cy: 25,
				width: 50,
				height: 50,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as RectState;

			const rect2: RectState = {
				id: "rect-2",
				type: "rect",
				cx: 75,
				cy: 75,
				width: 50,
				height: 50,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as RectState;

			const state: GroupState = {
				id: "group-3",
				type: "group",
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				children: [rect1, rect2],
			} as unknown as GroupState;

			const doc = groupToDoc(state);

			expect(doc.children).toHaveLength(2);
			expect(doc.children[0].id).toBe("rect-1");
			expect(doc.children[1].id).toBe("rect-2");
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const childDoc: RectDoc = {
				id: "rect-1",
				type: "rect",
				x: 10,
				y: 20,
				width: 100,
				height: 50,
			} as unknown as RectDoc;

			const originalDoc: GroupDoc = {
				id: "group-round-trip",
				type: "group",
				rotation: 30,
				flipX: true,
				children: [childDoc],
			} as unknown as GroupDoc;

			const state = groupToState(originalDoc);
			const convertedDoc = groupToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.rotation).toBe(originalDoc.rotation);
			expect(convertedDoc.flipX).toBe(originalDoc.flipX);
			expect(convertedDoc.children).toHaveLength(originalDoc.children.length);
			expect(convertedDoc.children[0].id).toBe(originalDoc.children[0].id);
		});
	});
});
