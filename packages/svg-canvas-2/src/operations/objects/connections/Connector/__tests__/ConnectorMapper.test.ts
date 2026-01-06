import { describe, expect, it } from "vitest";

import type { ConnectorDoc } from "../../../../../schemas/objects/connections/ConnectorDoc";
import type { ConnectorState } from "../../../../../states/objects/connections/ConnectorState";
import { connectorToDoc, connectorToState } from "../ConnectorMapper";

describe("ConnectorMapper", () => {
	describe("connectorToState", () => {
		it("should convert ConnectorDoc to ConnectorState with all properties", () => {
			const doc: ConnectorDoc = {
				id: "connector-1",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				startArrow: "arrow",
				endArrow: "circle",
			} as ConnectorDoc;

			const state = connectorToState(doc);

			expect(state.id).toBe("connector-1");
			expect(state.type).toBe("connector");
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

		it("should handle connector without arrows", () => {
			const doc: ConnectorDoc = {
				id: "connector-2",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
				],
				stroke: "#000000",
			} as ConnectorDoc;

			const state = connectorToState(doc);

			expect(state.id).toBe("connector-2");
			expect(state.type).toBe("connector");
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			]);
			expect(state.startArrow).toBeUndefined();
			expect(state.endArrow).toBeUndefined();
		});
	});

	describe("connectorToDoc", () => {
		it("should convert ConnectorState to ConnectorDoc with all properties", () => {
			const state: ConnectorState = {
				id: "connector-1",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
					{ x: 200, y: 0 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				startArrow: "arrow",
				endArrow: "circle",
			} as ConnectorState;

			const doc = connectorToDoc(state);

			expect(doc.id).toBe("connector-1");
			expect(doc.type).toBe("connector");
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

		it("should handle connector without arrows", () => {
			const state: ConnectorState = {
				id: "connector-2",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
				],
				stroke: "#000000",
			} as ConnectorState;

			const doc = connectorToDoc(state);

			expect(doc.id).toBe("connector-2");
			expect(doc.type).toBe("connector");
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
			const originalDoc: ConnectorDoc = {
				id: "connector-round-trip",
				type: "connector",
				points: [
					{ x: 10, y: 20 },
					{ x: 110, y: 70 },
					{ x: 210, y: 20 },
				],
				stroke: "#000000",
				strokeWidth: 2,
				startArrow: "arrow",
				endArrow: "circle",
			} as ConnectorDoc;

			const state = connectorToState(originalDoc);
			const convertedDoc = connectorToDoc(state);

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
