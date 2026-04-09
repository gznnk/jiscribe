import { describe, expect, it } from "vitest";

import type { EllipseDoc } from "../../../../../schemas/objects/primitives/EllipseDoc";
import type { EllipseState } from "../../../../../states/objects/primitives/ellipse/EllipseState";
import { ellipseToDoc, ellipseToState } from "../../../../../states/objects/primitives/ellipse/EllipseMapper";

describe("EllipseMapper", () => {
	describe("ellipseToState", () => {
		it("should convert EllipseDoc to EllipseState with all properties", () => {
			const doc: EllipseDoc = {
				id: "ellipse-1",
				type: "ellipse",
				cx: 100,
				cy: 150,
				rx: 50,
				ry: 30,
				rotation: 45,
				flipX: true,
				flipY: false,
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
			} as unknown as EllipseDoc;

			const state = ellipseToState(doc);

			expect(state.id).toBe("ellipse-1");
			expect(state.type).toBe("ellipse");
			expect(state.cx).toBe(100);
			expect(state.cy).toBe(150);
			expect(state.width).toBe(100); // rx * 2
			expect(state.height).toBe(60); // ry * 2
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1); // flipY = false
			expect(state.stroke).toBe("#000000");
			expect(state.strokeWidth).toBe(2);
			expect(state.fill).toBe("#ff0000");
		});

		it("should handle default transform values", () => {
			const doc: EllipseDoc = {
				id: "ellipse-2",
				type: "ellipse",
				cx: 50,
				cy: 50,
				rx: 25,
				ry: 25,
			} as unknown as EllipseDoc;

			const state = ellipseToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});

		it("should handle flipY correctly", () => {
			const doc: EllipseDoc = {
				id: "ellipse-3",
				type: "ellipse",
				cx: 50,
				cy: 50,
				rx: 25,
				ry: 25,
				flipY: true,
			} as unknown as EllipseDoc;

			const state = ellipseToState(doc);

			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(-1);
		});
	});

	describe("ellipseToDoc", () => {
		it("should convert EllipseState to EllipseDoc with all properties", () => {
			const state: EllipseState = {
				id: "ellipse-1",
				type: "ellipse",
				cx: 100,
				cy: 150,
				width: 100,
				height: 60,
				rotation: 45,
				scaleX: -1,
				scaleY: 1,
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
			} as unknown as EllipseState;

			const doc = ellipseToDoc(state);

			expect(doc.id).toBe("ellipse-1");
			expect(doc.type).toBe("ellipse");
			expect(doc.cx).toBe(100);
			expect(doc.cy).toBe(150);
			expect(doc.rx).toBe(50); // width / 2
			expect(doc.ry).toBe(30); // height / 2
			expect(doc.rotation).toBe(45);
			expect(doc.flipX).toBe(true); // scaleX < 0
			expect(doc.flipY).toBeUndefined(); // scaleY >= 0
			expect(doc.stroke).toBe("#000000");
			expect(doc.strokeWidth).toBe(2);
			expect(doc.fill).toBe("#ff0000");
		});

		it("should omit default transform values", () => {
			const state: EllipseState = {
				id: "ellipse-2",
				type: "ellipse",
				cx: 50,
				cy: 50,
				width: 50,
				height: 50,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as EllipseState;

			const doc = ellipseToDoc(state);

			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBeUndefined();
		});

		it("should handle negative scaleY correctly", () => {
			const state: EllipseState = {
				id: "ellipse-3",
				type: "ellipse",
				cx: 50,
				cy: 50,
				width: 50,
				height: 50,
				rotation: 0,
				scaleX: 1,
				scaleY: -1,
			} as unknown as EllipseState;

			const doc = ellipseToDoc(state);

			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBe(true);
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const originalDoc: EllipseDoc = {
				id: "ellipse-round-trip",
				type: "ellipse",
				cx: 100,
				cy: 150,
				rx: 50,
				ry: 30,
				rotation: 30,
				flipX: true,
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
			} as unknown as EllipseDoc;

			const state = ellipseToState(originalDoc);
			const convertedDoc = ellipseToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.cx).toBe(originalDoc.cx);
			expect(convertedDoc.cy).toBe(originalDoc.cy);
			expect(convertedDoc.rx).toBe(originalDoc.rx);
			expect(convertedDoc.ry).toBe(originalDoc.ry);
			expect(convertedDoc.rotation).toBe(originalDoc.rotation);
			expect(convertedDoc.flipX).toBe(originalDoc.flipX);
			expect(convertedDoc.stroke).toBe(originalDoc.stroke);
			expect(convertedDoc.strokeWidth).toBe(originalDoc.strokeWidth);
			expect(convertedDoc.fill).toBe(originalDoc.fill);
		});
	});
});
