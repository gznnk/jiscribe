import { describe, expect, it } from "vitest";

import type { RectDoc } from "../../../../../schemas/objects/primitives/RectDoc";
import { rectToDoc, rectToState } from "../../../../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../../../../states/objects/primitives/rect/RectState";

describe("RectMapper", () => {
	describe("rectToState", () => {
		it("should convert RectDoc to RectState with all properties", () => {
			const doc: RectDoc = {
				id: "rect-1",
				type: "rect",
				x: 10,
				y: 20,
				width: 100,
				height: 50,
				rotation: 45,
				flipX: true,
				flipY: false,
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
				text: "Sample Text",
				textType: "textarea",
				textAlign: "center",
				verticalAlign: "center",
				fontColor: "#333333",
				fontSize: 16,
				fontFamily: "Arial",
				fontWeight: "bold",
			} as unknown as RectDoc;

			const state = rectToState(doc);

			expect(state.id).toBe("rect-1");
			expect(state.type).toBe("rect");
			expect(state.cx).toBe(60); // x + width / 2
			expect(state.cy).toBe(45); // y + height / 2
			expect(state.width).toBe(100);
			expect(state.height).toBe(50);
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1); // flipY = false
			expect(state.stroke).toBe("#000000");
			expect(state.strokeWidth).toBe(2);
			expect(state.fill).toBe("#ff0000");
			expect(state.text).toBe("Sample Text");
			expect(state.textType).toBe("textarea");
			expect(state.textAlign).toBe("center");
			expect(state.verticalAlign).toBe("center");
			expect(state.fontColor).toBe("#333333");
			expect(state.fontSize).toBe(16);
			expect(state.fontFamily).toBe("Arial");
			expect(state.fontWeight).toBe("bold");
		});

		it("should handle default transform values", () => {
			const doc: RectDoc = {
				id: "rect-2",
				type: "rect",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
			} as unknown as RectDoc;

			const state = rectToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});

		it("should handle flipY correctly", () => {
			const doc: RectDoc = {
				id: "rect-3",
				type: "rect",
				x: 0,
				y: 0,
				width: 100,
				height: 100,
				flipY: true,
			} as unknown as RectDoc;

			const state = rectToState(doc);

			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(-1);
		});
	});

	describe("rectToDoc", () => {
		it("should convert RectState to RectDoc with all properties", () => {
			const state: RectState = {
				id: "rect-1",
				type: "rect",
				cx: 60,
				cy: 45,
				width: 100,
				height: 50,
				rotation: 45,
				scaleX: -1,
				scaleY: 1,
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
				text: "Sample Text",
				textType: "textarea",
				textAlign: "center",
				verticalAlign: "center",
				fontColor: "#333333",
				fontSize: 16,
				fontFamily: "Arial",
				fontWeight: "bold",
			} as unknown as RectState;

			const doc = rectToDoc(state);

			expect(doc.id).toBe("rect-1");
			expect(doc.type).toBe("rect");
			expect(doc.x).toBe(10); // cx - width / 2
			expect(doc.y).toBe(20); // cy - height / 2
			expect(doc.width).toBe(100);
			expect(doc.height).toBe(50);
			expect(doc.rotation).toBe(45);
			expect(doc.flipX).toBe(true); // scaleX < 0
			expect(doc.flipY).toBeUndefined(); // scaleY >= 0
			expect(doc.stroke).toBe("#000000");
			expect(doc.strokeWidth).toBe(2);
			expect(doc.fill).toBe("#ff0000");
			expect(doc.text).toBe("Sample Text");
			expect(doc.textType).toBe("textarea");
			expect(doc.textAlign).toBe("center");
			expect(doc.verticalAlign).toBe("center");
			expect(doc.fontColor).toBe("#333333");
			expect(doc.fontSize).toBe(16);
			expect(doc.fontFamily).toBe("Arial");
			expect(doc.fontWeight).toBe("bold");
		});

		it("should omit default transform values", () => {
			const state: RectState = {
				id: "rect-2",
				type: "rect",
				cx: 50,
				cy: 50,
				width: 100,
				height: 100,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as unknown as RectState;

			const doc = rectToDoc(state);

			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBeUndefined();
		});

		it("should handle negative scaleY correctly", () => {
			const state: RectState = {
				id: "rect-3",
				type: "rect",
				cx: 50,
				cy: 50,
				width: 100,
				height: 100,
				rotation: 0,
				scaleX: 1,
				scaleY: -1,
			} as unknown as RectState;

			const doc = rectToDoc(state);

			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBe(true);
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const originalDoc: RectDoc = {
				id: "rect-round-trip",
				type: "rect",
				x: 10,
				y: 20,
				width: 100,
				height: 50,
				rotation: 30,
				flipX: true,
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
				text: "Round Trip",
				textType: "markdown",
				textAlign: "left",
				verticalAlign: "start",
				fontColor: "#111111",
				fontSize: 14,
				fontFamily: "Noto Sans JP",
				fontWeight: "normal",
			} as unknown as RectDoc;

			const state = rectToState(originalDoc);
			const convertedDoc = rectToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.x).toBe(originalDoc.x);
			expect(convertedDoc.y).toBe(originalDoc.y);
			expect(convertedDoc.width).toBe(originalDoc.width);
			expect(convertedDoc.height).toBe(originalDoc.height);
			expect(convertedDoc.rotation).toBe(originalDoc.rotation);
			expect(convertedDoc.flipX).toBe(originalDoc.flipX);
			expect(convertedDoc.stroke).toBe(originalDoc.stroke);
			expect(convertedDoc.strokeWidth).toBe(originalDoc.strokeWidth);
			expect(convertedDoc.fill).toBe(originalDoc.fill);
			expect(convertedDoc.text).toBe(originalDoc.text);
			expect(convertedDoc.textType).toBe(originalDoc.textType);
			expect(convertedDoc.textAlign).toBe(originalDoc.textAlign);
			expect(convertedDoc.verticalAlign).toBe(originalDoc.verticalAlign);
			expect(convertedDoc.fontColor).toBe(originalDoc.fontColor);
			expect(convertedDoc.fontSize).toBe(originalDoc.fontSize);
			expect(convertedDoc.fontFamily).toBe(originalDoc.fontFamily);
			expect(convertedDoc.fontWeight).toBe(originalDoc.fontWeight);
		});
	});
});
