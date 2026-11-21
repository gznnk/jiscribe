import { describe, expect, it } from "vitest";

import type { ConnectorDoc } from "../../model/objects/connector/ConnectorDoc";
import type { EndpointRef } from "../../model/objects/types/EndpointRef";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import { resolveDocDefinitions } from "../../plugin/resolveDocDefinitions";
import { resolveConnectorDocPath } from "../utils/connectorPath";
import type { ObjectRecord } from "../utils/objectAccess";
import { calcObjectTransformedFrame } from "../utils/objectFrame";
import { getObjectBounds } from "../utils/objectGeometry";

/** A rect-geometry type declaring two connect points of its own beside the built-in four. */
const portedDefinition: ObjectDocDefinition = {
	features: {
		type: "ported",
		geometry: "rect",
		connectable: true,
		transform: true,
	},
	validateDoc: () => [],
	extraConnectPointIds: () => ["east", "west"],
};

/** A rect-geometry type that cannot be turned, so its canvas state carries no transform. */
const untransformedDefinition: ObjectDocDefinition = {
	features: { type: "untransformed", geometry: "rect", connectable: true },
	validateDoc: () => [],
};

const definitions = resolveDocDefinitions({
	plugins: [
		{
			id: "fixtures",
			objects: {
				ported: portedDefinition,
				untransformed: untransformedDefinition,
			},
		},
	],
});

const record = (fields: Record<string, unknown>): ObjectRecord =>
	fields as ObjectRecord;

const rect = (id: string, fields: Record<string, unknown> = {}): ObjectRecord =>
	record({ id, type: "rect", x: 0, y: 0, width: 100, height: 60, ...fields });

const owned = (id: string, anchor: EndpointRef["anchor"]): EndpointRef =>
	({ owner: { id }, anchor }) as EndpointRef;

const bottomToTop = (
	points: ConnectorDoc["points"],
): Pick<ConnectorDoc, "source" | "target" | "points"> => ({
	source: owned("a", { kind: "connectPoint", id: "bottomCenter" }),
	target: owned("b", { kind: "connectPoint", id: "topCenter" }),
	points,
});

describe("calcObjectTransformedFrame", () => {
	it("centres a rect's frame on its box", () => {
		expect(calcObjectTransformedFrame(rect("a"), definitions)).toEqual({
			cx: 50,
			cy: 30,
			width: 100,
			height: 60,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
	});

	it("frames an ellipse by its radii", () => {
		expect(
			calcObjectTransformedFrame(
				record({ id: "e", type: "ellipse", cx: 10, cy: 20, rx: 30, ry: 40 }),
				definitions,
			),
		).toEqual({
			cx: 10,
			cy: 20,
			width: 60,
			height: 80,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		});
	});

	it("carries the doc's angle in degrees and its flips as negative scales", () => {
		expect(
			calcObjectTransformedFrame(
				rect("a", { rotation: 30, flipX: true }),
				definitions,
			),
		).toMatchObject({ rotation: 30, scaleX: -1, scaleY: 1 });
	});

	it("frames a shape storing no height at the height its text needs", () => {
		const auto = rect("a", {
			height: undefined,
			text: "a label long enough to take several lines at this width",
		});
		const frame = calcObjectTransformedFrame(auto, definitions);

		expect(frame?.height).toBeGreaterThan(0);
		expect(frame?.height).toBe(getObjectBounds(auto, definitions)?.height);
	});

	it("frames nothing for a type without a transform, a connector or an unknown type", () => {
		expect(
			calcObjectTransformedFrame(
				rect("u", { type: "untransformed" }),
				definitions,
			),
		).toBeNull();
		expect(
			calcObjectTransformedFrame(
				record({ id: "c", type: "connector" }),
				definitions,
			),
		).toBeNull();
		expect(
			calcObjectTransformedFrame(rect("x", { type: "nowhere" }), definitions),
		).toBeNull();
	});
});

describe("resolveConnectorDocPath", () => {
	const source = rect("a");
	const target = rect("b", { x: 200, y: 200 });

	it("resolves the ends on their owners around the stored vertices", () => {
		expect(
			resolveConnectorDocPath(
				{ ...bottomToTop([{ x: 50, y: 130 }]), routing: "straight" },
				source,
				target,
				definitions,
			),
		).toEqual([
			{ x: 50, y: 60 },
			{ x: 50, y: 130 },
			{ x: 250, y: 200 },
		]);
	});

	it("aligns the end vertices on a right-angled line", () => {
		expect(
			resolveConnectorDocPath(
				{
					...bottomToTop([
						{ x: 40, y: 130 },
						{ x: 260, y: 130 },
					]),
					routing: "orthogonal",
				},
				source,
				target,
				definitions,
			),
		).toEqual([
			{ x: 50, y: 60 },
			{ x: 50, y: 130 },
			{ x: 250, y: 130 },
			{ x: 250, y: 200 },
		]);
	});

	it("resolves an owner storing no height on the height its text needs", () => {
		const auto = rect("a", {
			height: undefined,
			text: "a label long enough to take several lines at this width",
		});
		const height = getObjectBounds(auto, definitions)?.height ?? 0;

		const path = resolveConnectorDocPath(
			bottomToTop([{ x: 50, y: 300 }]),
			auto,
			target,
			definitions,
		);

		expect(height).toBeGreaterThan(0);
		expect(path?.[0]).toEqual({ x: 50, y: height });
	});

	it("leaves a connector with no stored vertices to the canvas", () => {
		expect(
			resolveConnectorDocPath(bottomToTop([]), source, target, definitions),
		).toBeNull();
		expect(
			resolveConnectorDocPath(
				bottomToTop(undefined),
				source,
				target,
				definitions,
			),
		).toBeNull();
	});

	it("answers null for an end on a connect point its owner's type declares", () => {
		const ported = record({
			id: "a",
			type: "ported",
			x: 0,
			y: 0,
			width: 100,
			height: 60,
		});

		expect(
			resolveConnectorDocPath(
				{
					source: owned("a", { kind: "connectPoint", id: "east" }),
					target: owned("b", { kind: "connectPoint", id: "topCenter" }),
					points: [{ x: 250, y: 30 }],
				},
				ported,
				target,
				definitions,
			),
		).toBeNull();
	});

	it("resolves an id the owner does not offer at its center", () => {
		expect(
			resolveConnectorDocPath(
				{
					source: owned("a", { kind: "connectPoint", id: "nowhere" }),
					target: owned("b", { kind: "connectPoint", id: "topCenter" }),
					points: [{ x: 250, y: 30 }],
				},
				source,
				target,
				definitions,
			)?.[0],
		).toEqual({ x: 50, y: 30 });
	});

	it("answers null for an owner that is missing, unknown or unframed", () => {
		const connector = bottomToTop([{ x: 50, y: 130 }]);

		expect(
			resolveConnectorDocPath(connector, undefined, target, definitions),
		).toBeNull();
		expect(
			resolveConnectorDocPath(
				connector,
				rect("a", { type: "nowhere" }),
				target,
				definitions,
			),
		).toBeNull();
		expect(
			resolveConnectorDocPath(
				connector,
				rect("a", { type: "untransformed" }),
				target,
				definitions,
			),
		).toBeNull();
	});

	it("takes a free end where it stands", () => {
		expect(
			resolveConnectorDocPath(
				{
					source: { anchor: { kind: "free", point: { x: -40, y: -40 } } },
					target: owned("b", { kind: "connectPoint", id: "topCenter" }),
					points: [{ x: 250, y: -40 }],
				},
				undefined,
				target,
				definitions,
			),
		).toEqual([
			{ x: -40, y: -40 },
			{ x: 250, y: -40 },
			{ x: 250, y: 200 },
		]);
	});
});
