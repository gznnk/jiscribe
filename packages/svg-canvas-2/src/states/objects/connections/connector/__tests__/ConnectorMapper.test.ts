import { describe, expect, it } from "vitest";

import type { ConnectorDoc } from "../../../../../schemas/objects/connections/ConnectorDoc";
import { connectorToDoc, connectorToState } from "../../../../../states/objects/connections/connector/ConnectorMapper";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";

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
				source: {
					owner: { type: "rect", id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					owner: { type: "rect", id: "rect-2" },
					anchor: { kind: "center" },
				},
				startArrow: "arrow",
				endArrow: "circle",
			} as unknown as ConnectorDoc;

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
			expect(state.source).toEqual({
				owner: { type: "rect", id: "rect-1" },
				anchor: { kind: "center" },
			});
			expect(state.target).toEqual({
				owner: { type: "rect", id: "rect-2" },
				anchor: { kind: "center" },
			});
			expect(state.startArrow).toBe("arrow");
			expect(state.endArrow).toBe("circle");
		});

		it("should handle connector with free endpoints", () => {
			const doc: ConnectorDoc = {
				id: "connector-2",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
				],
				stroke: "#000000",
				source: {
					anchor: { kind: "free", point: { x: 0, y: 0 } },
				},
				target: {
					anchor: { kind: "free", point: { x: 50, y: 50 } },
				},
			} as unknown as ConnectorDoc;

			const state = connectorToState(doc);

			expect(state.id).toBe("connector-2");
			expect(state.type).toBe("connector");
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			]);
			expect(state.source).toEqual({
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			});
			expect(state.target).toEqual({
				anchor: { kind: "free", point: { x: 50, y: 50 } },
			});
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
				source: {
					owner: { type: "rect", id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					owner: { type: "rect", id: "rect-2" },
					anchor: { kind: "center" },
				},
				startArrow: "arrow",
				endArrow: "circle",
			} as unknown as ConnectorState;

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
			expect(doc.source).toEqual({
				owner: { type: "rect", id: "rect-1" },
				anchor: { kind: "center" },
			});
			expect(doc.target).toEqual({
				owner: { type: "rect", id: "rect-2" },
				anchor: { kind: "center" },
			});
			expect(doc.startArrow).toBe("arrow");
			expect(doc.endArrow).toBe("circle");
		});

		it("should handle connector with free endpoints", () => {
			const state: ConnectorState = {
				id: "connector-2",
				type: "connector",
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
				],
				stroke: "#000000",
				source: {
					anchor: { kind: "free", point: { x: 0, y: 0 } },
				},
				target: {
					anchor: { kind: "free", point: { x: 50, y: 50 } },
				},
			} as unknown as ConnectorState;

			const doc = connectorToDoc(state);

			expect(doc.id).toBe("connector-2");
			expect(doc.type).toBe("connector");
			expect(doc.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			]);
			expect(doc.source).toEqual({
				anchor: { kind: "free", point: { x: 0, y: 0 } },
			});
			expect(doc.target).toEqual({
				anchor: { kind: "free", point: { x: 50, y: 50 } },
			});
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
				source: {
					owner: { type: "rect", id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					owner: { type: "rect", id: "rect-2" },
					anchor: { kind: "connectPoint", id: "cp-1" },
				},
				startArrow: "arrow",
				endArrow: "circle",
			} as unknown as ConnectorDoc;

			const state = connectorToState(originalDoc);
			const convertedDoc = connectorToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			expect(convertedDoc.points).toEqual(originalDoc.points);
			expect(convertedDoc.stroke).toBe(originalDoc.stroke);
			expect(convertedDoc.strokeWidth).toBe(originalDoc.strokeWidth);
			expect(convertedDoc.source).toEqual(originalDoc.source);
			expect(convertedDoc.target).toEqual(originalDoc.target);
			expect(convertedDoc.startArrow).toBe(originalDoc.startArrow);
			expect(convertedDoc.endArrow).toBe(originalDoc.endArrow);
		});
	});
});
