import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { resolveConnectorPoints } from "../resolveConnectorPoints";
import { resolveConnectorPointsCached } from "../resolveConnectorPointsCached";

type GeometryRegistries = {
	outline: Parameters<typeof resolveConnectorPointsCached>[3];
	anchorRegion: Parameters<typeof resolveConnectorPointsCached>[4];
	extraConnectPoints: Parameters<typeof resolveConnectorPointsCached>[5];
	geometryKey: Parameters<typeof resolveConnectorPointsCached>[6];
};

const resolveCachedThrough = (
	connector: ConnectorState,
	sourceObj: ObjectState,
	targetObj: ObjectState,
	registries: GeometryRegistries,
) =>
	resolveConnectorPointsCached(
		connector,
		sourceObj,
		targetObj,
		registries.outline,
		registries.anchorRegion,
		registries.extraConnectPoints,
		registries.geometryKey,
	);

const centerOf = (id: string): EndpointRef =>
	({ owner: { id }, anchor: { kind: "center" } }) as EndpointRef;

const connectorBetween = (sourceId: string, targetId: string): ConnectorState =>
	({
		source: centerOf(sourceId),
		target: centerOf(targetId),
		points: [],
		routing: "straight",
	}) as unknown as ConnectorState;

const diamond = (id: string, cx: number): ObjectState =>
	({
		id,
		type: "diamond",
		features: { type: "diamond", geometry: "rect" },
		cx,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/** Registries counting how often the outline is asked for. */
const countingRegistries = (
	geometryKey: GeometryRegistries["geometryKey"] = { get: () => undefined },
): GeometryRegistries & {
	outlineCalls: () => number;
} => {
	let calls = 0;
	const outline = ({ width, height }: { width: number; height: number }) => {
		calls++;
		const points: Point[] = [
			{ x: 0, y: -height / 2 },
			{ x: width / 2, y: 0 },
			{ x: 0, y: height / 2 },
			{ x: -width / 2, y: 0 },
		];
		return points;
	};
	return {
		outline: {
			get: (type) => (type === "diamond" ? (outline as never) : undefined),
		},
		anchorRegion: { get: () => undefined },
		extraConnectPoints: { get: () => undefined },
		geometryKey,
		outlineCalls: () => calls,
	};
};

describe("resolveConnectorPointsCached", () => {
	it("answers as resolveConnectorPoints does through the same registries", () => {
		const registries = countingRegistries();
		const connector = connectorBetween("a", "b");
		const a = diamond("a", 0);
		const b = diamond("b", 300);

		expect(resolveCachedThrough(connector, a, b, registries)).toEqual(
			resolveConnectorPoints(
				connector,
				a,
				b,
				registries.outline,
				registries.anchorRegion,
				registries.extraConnectPoints,
			),
		);
	});

	it("hands back the same answer while the connector and both owners are the same objects", () => {
		const registries = countingRegistries();
		const connector = connectorBetween("a", "b");
		const a = diamond("a", 0);
		const b = diamond("b", 300);

		const first = resolveCachedThrough(connector, a, b, registries);
		const callsAfterFirst = registries.outlineCalls();
		const second = resolveCachedThrough(connector, a, b, registries);

		expect(second).toBe(first);
		expect(registries.outlineCalls()).toBe(callsAfterFirst);
	});

	it("resolves again once an owner is replaced", () => {
		const registries = countingRegistries();
		const connector = connectorBetween("a", "b");
		const b = diamond("b", 300);

		const before = resolveCachedThrough(
			connector,
			diamond("a", 0),
			b,
			registries,
		);
		const after = resolveCachedThrough(
			connector,
			diamond("a", 100),
			b,
			registries,
		);

		expect(after).not.toBe(before);
		expect(after?.source.x).toBeGreaterThan(before?.source.x ?? Infinity);
	});

	it("hands back the same answer when an owner is replaced by a copy differing only in style", () => {
		const registries = countingRegistries();
		const connector = connectorBetween("a", "b");
		const a = diamond("a", 0);
		const b = diamond("b", 300);

		const first = resolveCachedThrough(connector, a, b, registries);
		const callsAfterFirst = registries.outlineCalls();
		const restyledA = { ...a, fill: "#ff0000" } as ObjectState;
		const second = resolveCachedThrough(connector, restyledA, b, registries);

		expect(second).toBe(first);
		expect(registries.outlineCalls()).toBe(callsAfterFirst);
	});

	it("resolves again when only an owner's geometry key changes", () => {
		const registries = countingRegistries({
			get: () => (obj) => (obj as { tail?: number }).tail,
		});
		const connector = connectorBetween("a", "b");
		const a = diamond("a", 0);
		const b = diamond("b", 300);

		const first = resolveCachedThrough(
			connector,
			{ ...a, tail: 1 } as ObjectState,
			b,
			registries,
		);
		const second = resolveCachedThrough(
			connector,
			{ ...a, tail: 2 } as ObjectState,
			b,
			registries,
		);

		expect(second).not.toBe(first);
	});

	it("never hands one canvas's answer to another", () => {
		const connector = connectorBetween("a", "b");
		const a = diamond("a", 0);
		const b = diamond("b", 300);
		const withOutline = countingRegistries();
		const withoutOutline: GeometryRegistries = {
			outline: { get: () => undefined },
			anchorRegion: { get: () => undefined },
			extraConnectPoints: { get: () => undefined },
			geometryKey: { get: () => undefined },
		};

		resolveCachedThrough(connector, a, b, withOutline);

		expect(resolveCachedThrough(connector, a, b, withoutOutline)).toEqual(
			resolveConnectorPoints(connector, a, b),
		);
	});
});
