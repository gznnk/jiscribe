import { describe, expect, it } from "vitest";

import type { PolylineDoc } from "../../../../../schemas/objects/primitives/PolylineDoc";
import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";
import { polylineToDoc, polylineToState } from "../../../../../states/objects/primitives/polyline/PolylineMapper";

describe("PolylineMapper", () => {
	describe("polylineToState", () => {
		it("should convert PolylineDoc to PolylineState with all properties", () => {
			const doc: PolylineDoc = {
				id: "polyline-1",
				type: "polyline",
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				startArrow: "arrow",
				endArrow: "circle",
			} as unknown as PolylineDoc;

			const state = polylineToState(doc);

			expect(state.id).toBe("polyline-1");
			expect(state.type).toBe("polyline");
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
				{ x: 200, y: 0 },
			]);
			expect(state.stroke).toBe("#000000");
			expect(state.strokeWidth).toBe(2);
			expect(state.startArrow).toBe("arrow");
			expect(state.endArrow).toBe("circle");
		});

		it("should handle polyline without arrows", () => {
			const doc: PolylineDoc = {
				id: "polyline-2",
				type: "polyline",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
				],
				stroke: "#000000",
			} as unknown as PolylineDoc;

			const state = polylineToState(doc);

			expect(state.id).toBe("polyline-2");
			expect(state.type).toBe("polyline");
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			]);
			expect(state.startArrow).toBeUndefined();
			expect(state.endArrow).toBeUndefined();
		});
	});

	describe("polylineToDoc", () => {
		it("should convert PolylineState to PolylineDoc with all properties", () => {
			const state: PolylineState = {
				id: "polyline-1",
				type: "polyline",
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				startArrow: "arrow",
				endArrow: "circle",
			} as unknown as PolylineState;

			const doc = polylineToDoc(state);

			expect(doc.id).toBe("polyline-1");
			expect(doc.type).toBe("polyline");
			expect(doc.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
				{ x: 200, y: 0 },
			]);
			expect(doc.stroke).toBe("#000000");
			expect(doc.strokeWidth).toBe(2);
			expect(doc.startArrow).toBe("arrow");
			expect(doc.endArrow).toBe("circle");
		});

		it("should handle polyline without arrows", () => {
			const state: PolylineState = {
				id: "polyline-2",
				type: "polyline",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
				],
				stroke: "#000000",
			} as unknown as PolylineState;

			const doc = polylineToDoc(state);

			expect(doc.id).toBe("polyline-2");
			expect(doc.type).toBe("polyline");
			expect(doc.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			]);
			expect(doc.startArrow).toBeUndefined();
			expect(doc.endArrow).toBeUndefined();
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const originalDoc: PolylineDoc = {
				id: "polyline-round-trip",
				type: "polyline",
				points: [
					{ x: 10, y: 20 },
					{ x: 110, y: 70 },
					{ x: 210, y: 20 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				startArrow: "arrow",
				endArrow: "circle",
			} as unknown as PolylineDoc;

			const state = polylineToState(originalDoc);
			const convertedDoc = polylineToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.points).toEqual(originalDoc.points);
			expect(convertedDoc.stroke).toBe(originalDoc.stroke);
			expect(convertedDoc.strokeWidth).toBe(originalDoc.strokeWidth);
			expect(convertedDoc.startArrow).toBe(originalDoc.startArrow);
			expect(convertedDoc.endArrow).toBe(originalDoc.endArrow);
		});
	});
});
