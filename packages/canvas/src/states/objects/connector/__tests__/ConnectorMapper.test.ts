import { describe, expect, it } from "vitest";

import type { ConnectorDoc } from "../../../../schemas/objects/connector/ConnectorDoc";
import {
	connectorToDoc,
	connectorToState,
} from "../../../../states/objects/connector/ConnectorMapper";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";

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
					owner: { id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					owner: { id: "rect-2" },
					anchor: { kind: "center" },
				},
				startArrow: "OpenArrow",
				endArrow: "Circle",
			} as unknown as ConnectorDoc;

			const state = connectorToState(doc);

			expect(state.id).toBe("connector-1");
			expect(state.type).toBe("connector");
			// points (intermediate waypoints) are carried over as-is on load.
			expect(state.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
				{ x: 200, y: 0 },
			]);
			// routing stays undefined and is carried over when unspecified.
			expect(state.routing).toBeUndefined();
			expect(state.stroke).toBe("#000000");
			expect(state.strokeWidth).toBe(2);
			expect(state.source).toEqual({
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			});
			expect(state.target).toEqual({
				owner: { id: "rect-2" },
				anchor: { kind: "center" },
			});
			expect(state.startArrow).toBe("OpenArrow");
			expect(state.endArrow).toBe("Circle");
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
			// points (intermediate waypoints) are carried over as-is on load.
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
					owner: { id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					owner: { id: "rect-2" },
					anchor: { kind: "center" },
				},
				startArrow: "OpenArrow",
				endArrow: "Circle",
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
				owner: { id: "rect-1" },
				anchor: { kind: "center" },
			});
			expect(doc.target).toEqual({
				owner: { id: "rect-2" },
				anchor: { kind: "center" },
			});
			expect(doc.startArrow).toBe("OpenArrow");
			expect(doc.endArrow).toBe("Circle");
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
				routing: "orthogonal",
				source: {
					owner: { id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					owner: { id: "rect-2" },
					anchor: { kind: "connectPoint", id: "topCenter" },
				},
				startArrow: "OpenArrow",
				endArrow: "Circle",
			} as unknown as ConnectorDoc;

			const state = connectorToState(originalDoc);
			const convertedDoc = connectorToDoc(state);

			expect(convertedDoc.id).toBe(originalDoc.id);
			expect(convertedDoc.type).toBe(originalDoc.type);
			// points (intermediate waypoints) are preserved across the round-trip.
			expect(convertedDoc.points).toEqual(originalDoc.points);
			// routing is also preserved across the round-trip.
			expect(convertedDoc.routing).toBe("orthogonal");
			expect(convertedDoc.stroke).toBe(originalDoc.stroke);
			expect(convertedDoc.strokeWidth).toBe(originalDoc.strokeWidth);
			expect(convertedDoc.source).toEqual(originalDoc.source);
			expect(convertedDoc.target).toEqual(originalDoc.target);
			expect(convertedDoc.startArrow).toBe(originalDoc.startArrow);
			expect(convertedDoc.endArrow).toBe(originalDoc.endArrow);
		});

		it("should preserve the label through round-trip conversion", () => {
			const originalDoc: ConnectorDoc = {
				id: "connector-label",
				type: "connector",
				points: [],
				source: {
					owner: { id: "rect-1" },
					anchor: { kind: "center" },
				},
				target: {
					anchor: { kind: "free", point: { x: 50, y: 50 } },
				},
				label: { text: "Yes", position: 0.4, offset: 6, fontSize: 14 },
			} as unknown as ConnectorDoc;

			const state = connectorToState(originalDoc);
			expect(state.label).toEqual({
				text: "Yes",
				position: 0.4,
				offset: 6,
				fontSize: 14,
			});
			const convertedDoc = connectorToDoc(state);
			expect(convertedDoc.label).toEqual(originalDoc.label);
		});
	});
});
