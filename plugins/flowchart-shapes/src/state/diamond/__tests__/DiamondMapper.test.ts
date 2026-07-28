import { describe, expect, it } from "vitest";

import type { DiamondDoc } from "../../../schema/diamond/DiamondDoc";
import { diamondToDoc, diamondToState } from "../DiamondMapper";
import type { DiamondState } from "../DiamondState";

describe("DiamondMapper", () => {
	describe("diamondToState", () => {
		it("should convert DiamondDoc to DiamondState with all properties", () => {
			const doc: DiamondDoc = {
				id: "diamond-1",
				type: "diamond",
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
				text: "Decision",
				textAlign: "center",
				verticalAlign: "middle",
				fontColor: "#333333",
				fontSize: 16,
				fontFamily: "Arial",
				fontWeight: "bold",
			} as unknown as DiamondDoc;

			const state = diamondToState(doc);

			expect(state.id).toBe("diamond-1");
			expect(state.type).toBe("diamond");
			expect(state.cx).toBe(60); // x + width / 2
			expect(state.cy).toBe(45); // y + height / 2
			expect(state.width).toBe(100);
			expect(state.height).toBe(50);
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1); // flipY = false
			expect(state.stroke).toBe("#000000");
			expect(state.fill).toBe("#ff0000");
			// The doc's flat text group becomes the one body slot, styling included.
			expect(state.text).toEqual({
				body: {
					text: "Decision",
					textAlign: "center",
					verticalAlign: "middle",
					fontColor: "#333333",
					fontSize: 16,
					fontFamily: "Arial",
					fontWeight: "bold",
				},
			});
		});

		it("should handle default transform values", () => {
			const doc: DiamondDoc = {
				id: "diamond-2",
				type: "diamond",
				x: 0,
				y: 0,
				width: 50,
				height: 50,
			} as unknown as DiamondDoc;

			const state = diamondToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});
	});

	describe("diamondToDoc", () => {
		it("should convert DiamondState to DiamondDoc with all properties", () => {
			const state: DiamondState = {
				id: "diamond-1",
				type: "diamond",
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
				text: {
					body: {
						text: "Decision",
						textAlign: "center",
						verticalAlign: "middle",
						fontColor: "#333333",
						fontSize: 16,
						fontFamily: "Arial",
						fontWeight: "bold",
					},
				},
			} as unknown as DiamondState;

			const doc = diamondToDoc(state);

			expect(doc.id).toBe("diamond-1");
			expect(doc.type).toBe("diamond");
			expect(doc.x).toBe(10); // cx - width / 2
			expect(doc.y).toBe(20); // cy - height / 2
			expect(doc.width).toBe(100);
			expect(doc.height).toBe(50);
			expect(doc.rotation).toBe(45);
			expect(doc.flipX).toBe(true); // scaleX < 0
			expect(doc.flipY).toBeUndefined(); // scaleY >= 0
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const originalDoc: DiamondDoc = {
				id: "diamond-round-trip",
				type: "diamond",
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
				textAlign: "center",
				verticalAlign: "middle",
				fontColor: "#444444",
				fontSize: 20,
				fontFamily: "Georgia",
				fontWeight: "normal",
			} as unknown as DiamondDoc;

			const state = diamondToState(originalDoc);
			const convertedDoc = diamondToDoc(state);

			expect(convertedDoc.x).toBe(originalDoc.x);
			expect(convertedDoc.y).toBe(originalDoc.y);
			expect(convertedDoc.width).toBe(originalDoc.width);
			expect(convertedDoc.height).toBe(originalDoc.height);
			expect(convertedDoc.rotation).toBe(originalDoc.rotation);
			expect(convertedDoc.flipX).toBe(originalDoc.flipX);
			expect(convertedDoc.text).toBe(originalDoc.text);
		});
	});
});
