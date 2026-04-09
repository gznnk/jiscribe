import { describe, expect, it } from "vitest";

import type { PolygonDoc } from "../../../../../schemas/objects/primitives/PolygonDoc";
import { polygonToDoc, polygonToState } from "../../../../../states/objects/primitives/polygon/PolygonMapper";
import type { PolygonState } from "../../../../../states/objects/primitives/polygon/PolygonState";

describe("PolygonMapper", () => {
	describe("polygonToState", () => {
		it("should convert PolygonDoc to PolygonState with all properties", () => {
			const doc: PolygonDoc = {
				id: "polygon-1",
				type: "polygon",
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 50, y: 100 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
			} as unknown as PolygonDoc;

			const state = polygonToState(doc);

			expect(state.id).toBe("polygon-1");
			expect(state.type).toBe("polygon");
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 50, y: 100 },
			]);
			expect(state.stroke).toBe("#000000");
			expect(state.strokeWidth).toBe(2);
			expect(state.fill).toBe("#ff0000");
		});

		it("should handle polygon without style properties", () => {
			const doc: PolygonDoc = {
				id: "polygon-2",
				type: "polygon",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
					{ x: 0, y: 50 },
				],
			} as unknown as PolygonDoc;

			const state = polygonToState(doc);

			expect(state.id).toBe("polygon-2");
			expect(state.type).toBe("polygon");
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
				{ x: 0, y: 50 },
			]);
			expect(state.stroke).toBeUndefined();
			expect(state.strokeWidth).toBeUndefined();
			expect(state.fill).toBeUndefined();
		});
	});

	describe("polygonToDoc", () => {
		it("should convert PolygonState to PolygonDoc with all properties", () => {
			const state: PolygonState = {
				id: "polygon-1",
				type: "polygon",
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 50, y: 100 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
			} as unknown as PolygonState;

			const doc = polygonToDoc(state);

			expect(doc.id).toBe("polygon-1");
			expect(doc.type).toBe("polygon");
			expect(doc.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 50, y: 100 },
			]);
			expect(doc.stroke).toBe("#000000");
			expect(doc.strokeWidth).toBe(2);
			expect(doc.fill).toBe("#ff0000");
		});

		it("should handle polygon without style properties", () => {
			const state: PolygonState = {
				id: "polygon-2",
				type: "polygon",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
					{ x: 0, y: 50 },
				],
			} as unknown as PolygonState;

			const doc = polygonToDoc(state);

			expect(doc.id).toBe("polygon-2");
			expect(doc.type).toBe("polygon");
			expect(doc.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
				{ x: 0, y: 50 },
			]);
			expect(doc.stroke).toBeUndefined();
			expect(doc.strokeWidth).toBeUndefined();
			expect(doc.fill).toBeUndefined();
		});
	});

	describe("bidirectional conversion", () => {
		it("should maintain data integrity through round-trip conversion", () => {
			const originalDoc: PolygonDoc = {
				id: "polygon-round-trip",
				type: "polygon",
				points: [
					{ x: 10, y: 20 },
					{ x: 110, y: 20 },
					{ x: 60, y: 120 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				fill: "#ff0000",
			} as unknown as PolygonDoc;

			const state = polygonToState(originalDoc);
			const convertedDoc = polygonToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.points).toEqual(originalDoc.points);
			expect(convertedDoc.stroke).toBe(originalDoc.stroke);
			expect(convertedDoc.strokeWidth).toBe(originalDoc.strokeWidth);
			expect(convertedDoc.fill).toBe(originalDoc.fill);
		});
	});
});
