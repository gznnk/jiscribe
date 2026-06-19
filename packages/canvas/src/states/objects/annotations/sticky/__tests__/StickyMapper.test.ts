import { describe, expect, it } from "vitest";

import type { StickyDoc } from "../../../../../schemas/objects/annotations/sticky/StickyDoc";
import {
	stickyToDoc,
	stickyToState,
} from "../../../../../states/objects/annotations/sticky/StickyMapper";
import type { StickyState } from "../../../../../states/objects/annotations/sticky/StickyState";

describe("StickyMapper", () => {
	describe("stickyToState", () => {
		it("should convert StickyDoc to StickyState with all properties", () => {
			const doc: StickyDoc = {
				id: "sticky-1",
				type: "sticky",
				x: 10,
				y: 20,
				width: 100,
				height: 50,
				rotation: 45,
				flipX: true,
				flipY: false,
				fill: "#ffff00",
			} as unknown as StickyDoc;

			const state = stickyToState(doc);

			expect(state.id).toBe("sticky-1");
			expect(state.type).toBe("sticky");
			expect(state.cx).toBe(60); // x + width / 2
			expect(state.cy).toBe(45); // y + height / 2
			expect(state.width).toBe(100);
			expect(state.height).toBe(50);
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1); // flipY = false
			expect(state.fill).toBe("#ffff00");
		});

		it("should handle default transform values", () => {
			const doc: StickyDoc = {
				id: "sticky-2",
				type: "sticky",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
			} as unknown as StickyDoc;

			const state = stickyToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});

		it("should handle flipY correctly", () => {
			const doc: StickyDoc = {
				id: "sticky-3",
				type: "sticky",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
				flipY: true,
			} as unknown as StickyDoc;

			const state = stickyToState(doc);

			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(-1);
		});
	});

	describe("stickyToDoc", () => {
		it("should convert StickyState to StickyDoc with all properties", () => {
			const state: StickyState = {
				id: "sticky-1",
				type: "sticky",
				cx: 60,
				cy: 45,
				width: 100,
				height: 50,
				rotation: 45,
				scaleX: -1,
				scaleY: 1,
				fill: "#ffff00",
			} as unknown as StickyState;

			const doc = stickyToDoc(state);

			expect(doc.id).toBe("sticky-1");
			expect(doc.type).toBe("sticky");
			expect(doc.x).toBe(10); // cx - width / 2
			expect(doc.y).toBe(20); // cy - height / 2
			expect(doc.width).toBe(100);
			expect(doc.height).toBe(50);
			expect(doc.rotation).toBe(45);
			expect(doc.flipX).toBe(true); // scaleX < 0
			expect(doc.flipY).toBeUndefined(); // scaleY >= 0
			expect(doc.fill).toBe("#ffff00");
		});

		it("should omit default transform values", () => {
			const state: StickyState = {
				id: "sticky-2",
				type: "sticky",
				cx: 50,
				cy: 50,
				width: 100,
				height: 100,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as StickyState;

			const doc = stickyToDoc(state);

			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBeUndefined();
		});

		it("should handle negative scaleY correctly", () => {
			const state: StickyState = {
				id: "sticky-3",
				type: "sticky",
				cx: 50,
				cy: 50,
				width: 100,
				height: 100,
				rotation: 0,
				scaleX: 1,
				scaleY: -1,
			} as unknown as StickyState;

			const doc = stickyToDoc(state);

			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBe(true);
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const originalDoc: StickyDoc = {
				id: "sticky-round-trip",
				type: "sticky",
				x: 10,
				y: 20,
				width: 100,
				height: 50,
				rotation: 30,
				flipX: true,
				fill: "#ffff00",
			} as unknown as StickyDoc;

			const state = stickyToState(originalDoc);
			const convertedDoc = stickyToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.x).toBe(originalDoc.x);
			expect(convertedDoc.y).toBe(originalDoc.y);
			expect(convertedDoc.width).toBe(originalDoc.width);
			expect(convertedDoc.height).toBe(originalDoc.height);
			expect(convertedDoc.rotation).toBe(originalDoc.rotation);
			expect(convertedDoc.flipX).toBe(originalDoc.flipX);
			expect(convertedDoc.fill).toBe(originalDoc.fill);
		});
	});
});
