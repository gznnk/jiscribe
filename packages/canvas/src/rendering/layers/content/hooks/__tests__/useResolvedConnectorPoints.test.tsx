// @vitest-environment jsdom

import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { createObjectGeometryKeyRegistry } from "../../../../objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectGeometryKeyRegistry } from "../../../../objects/registry/ObjectGeometryKeyRegistry";
import { ObjectGeometryKeyRegistryContext } from "../../../../objects/registry/ObjectGeometryKeyRegistryContext";
import {
	type ResolvedConnectorPoints,
	useResolvedConnectorPoints,
} from "../useResolvedConnectorPoints";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

const centerOf = (id: string): EndpointRef => ({
	owner: { id },
	anchor: { kind: "center" },
});

const connector = {
	id: "line",
	type: "connector",
	source: centerOf("a"),
	target: centerOf("b"),
	points: [],
	routing: "straight",
} as unknown as ConnectorState;

const rectAt = (id: string, cx: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy: 0,
		width: 100,
		height: 60,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

type ProbeProps = {
	connectorState: ConnectorState;
	sourceObj: ObjectState | null;
	targetObj: ObjectState | null;
};

/**
 * Mounts the hook, recording every answer it gives, and returns a rerender that
 * passes new arguments through the same mounted component.
 */
const mountProbe = (
	initialProps: ProbeProps,
	geometryKeyRegistry: ObjectGeometryKeyRegistry = createObjectGeometryKeyRegistry(),
) => {
	const answers: (ResolvedConnectorPoints | null)[] = [];
	const Probe = ({ connectorState, sourceObj, targetObj }: ProbeProps) => {
		answers.push(
			useResolvedConnectorPoints(connectorState, sourceObj, targetObj),
		);
		return null;
	};
	const root: Root = createRoot(document.createElement("div"));
	const render = (props: ProbeProps) =>
		act(() =>
			root.render(
				<ObjectGeometryKeyRegistryContext value={geometryKeyRegistry}>
					<Probe {...props} />
				</ObjectGeometryKeyRegistryContext>,
			),
		);
	render(initialProps);
	unmount = () => act(() => root.unmount());
	return { answers, rerender: render };
};

describe("useResolvedConnectorPoints", () => {
	it("lists the path from source to target", () => {
		const { answers } = mountProbe({
			connectorState: connector,
			sourceObj: rectAt("a", 0),
			targetObj: rectAt("b", 300),
		});

		const resolved = answers.at(-1);
		expect(resolved?.points[0]).toEqual(resolved?.source);
		expect(resolved?.points.at(-1)).toEqual(resolved?.target);
		expect(resolved?.source.x).toBeLessThan(resolved?.target.x ?? -Infinity);
	});

	it("keeps the very same answer when the connector and an owner are cloned without a geometry change", () => {
		const a = rectAt("a", 0);
		const b = rectAt("b", 300);
		const { answers, rerender } = mountProbe({
			connectorState: connector,
			sourceObj: a,
			targetObj: b,
		});

		rerender({
			connectorState: { ...connector, stroke: "#ff0000" } as ConnectorState,
			sourceObj: { ...a, fill: "#00ff00" } as ObjectState,
			targetObj: b,
		});

		expect(answers).toHaveLength(2);
		expect(answers[1]).toBe(answers[0]);
	});

	it("answers anew when an owner moves", () => {
		const b = rectAt("b", 300);
		const { answers, rerender } = mountProbe({
			connectorState: connector,
			sourceObj: rectAt("a", 0),
			targetObj: b,
		});

		rerender({
			connectorState: connector,
			sourceObj: rectAt("a", 100),
			targetObj: b,
		});

		expect(answers[1]).not.toBe(answers[0]);
		expect(answers[1]?.source.x).toBeGreaterThan(answers[0]?.source.x ?? 0);
	});

	it("answers anew when only an owner's geometry key changes", () => {
		const geometryKeyRegistry = createObjectGeometryKeyRegistry();
		geometryKeyRegistry.register(
			"rect",
			(obj) => (obj as ObjectState & { tail?: number }).tail,
		);
		const a = rectAt("a", 0);
		const b = rectAt("b", 300);
		const { answers, rerender } = mountProbe(
			{
				connectorState: connector,
				sourceObj: { ...a, tail: 1 } as ObjectState,
				targetObj: b,
			},
			geometryKeyRegistry,
		);

		rerender({
			connectorState: connector,
			sourceObj: { ...a, tail: 2 } as ObjectState,
			targetObj: b,
		});

		expect(answers[1]).not.toBe(answers[0]);
	});

	it("answers anew when the connector's own route changes", () => {
		const a = rectAt("a", 0);
		const b = rectAt("b", 300);
		const { answers, rerender } = mountProbe({
			connectorState: connector,
			sourceObj: a,
			targetObj: b,
		});

		rerender({
			connectorState: {
				...connector,
				points: [{ x: 150, y: 200 }],
			} as unknown as ConnectorState,
			sourceObj: a,
			targetObj: b,
		});

		expect(answers[1]).not.toBe(answers[0]);
		expect(answers[1]?.points).toHaveLength(3);
	});
});
