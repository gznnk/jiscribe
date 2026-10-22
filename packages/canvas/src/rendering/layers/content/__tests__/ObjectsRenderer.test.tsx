// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { createObjectComponentRegistry } from "../../../objects/registry/ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "../../../objects/registry/ObjectComponentRegistryContext";
import type { MovePreview } from "../MovePreview";
import { ObjectRenderBoundary } from "../ObjectRenderBoundary";
import { ObjectsRenderer } from "../ObjectsRenderer";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** How many times Probe has drawn, per object id. */
const probeRenders = new Map<string, number>();

/** Stands in for a shape's component: draws its position. */
const Probe = ({ id, cx, cy }: { id: string; cx: number; cy: number }) => {
	probeRenders.set(id, (probeRenders.get(id) ?? 0) + 1);
	return <rect data-probe={id} x={cx} y={cy} />;
};

const registry = createObjectComponentRegistry();
registry.register("rect", Probe);

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({ id, type: "rect", cx, cy, width: 20, height: 20 }) as ObjectState;

const makeConnector = (
	id: string,
	sourceId: string,
	targetId: string,
	{
		routing = "straight",
		points = [],
	}: {
		routing?: "straight" | "orthogonal";
		points?: { x: number; y: number }[];
	} = {},
): ObjectState =>
	({
		id,
		type: "connector",
		source: { owner: { id: sourceId }, anchor: { kind: "center" } },
		target: { owner: { id: targetId }, anchor: { kind: "center" } },
		routing,
		points,
	}) as unknown as ObjectState;

/** Every object in `objects` moved by `delta` when listed in `ids`, as the drag handler writes them. */
const moveObjects = (
	objects: Record<string, ObjectState>,
	ids: readonly string[],
	delta: { x: number; y: number },
): Record<string, ObjectState> => {
	const movedObjects = { ...objects };
	for (const id of ids) {
		const srcRect = objects[id] as ObjectState & { cx: number; cy: number };
		movedObjects[id] = {
			...srcRect,
			cx: srcRect.cx + delta.x,
			cy: srcRect.cy + delta.y,
		} as ObjectState;
	}
	return movedObjects;
};

const previewOf = (
	startObjects: Record<string, ObjectState>,
	ids: readonly string[],
	delta: { x: number; y: number },
): MovePreview => ({ delta, translatedIds: new Set(ids), startObjects });

let container: HTMLElement;
let root: Root;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	probeRenders.clear();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const draw = (
	objects: Record<string, ObjectState>,
	movePreview?: MovePreview,
	textEditObjectId?: string,
): void => {
	act(() =>
		root.render(
			<ObjectComponentRegistryContext value={registry}>
				<svg>
					<ObjectsRenderer
						objects={objects}
						rootIds={Object.keys(objects)}
						movePreview={movePreview}
						textEditObjectId={textEditObjectId}
					/>
				</svg>
			</ObjectComponentRegistryContext>,
		),
	);
};

const probeOf = (id: string): Element => {
	const probe = container.querySelector(`[data-probe="${id}"]`);
	if (probe === null) {
		throw new Error(`${id} is not drawn`);
	}
	return probe;
};

/** The wrapper `<g>` ObjectsRenderer puts around the element. */
const wrapperOf = (element: Element): Element => {
	const wrapper = element.parentElement;
	if (wrapper === null || wrapper.tagName.toLowerCase() !== "g") {
		throw new Error("the element has no wrapper <g>");
	}
	return wrapper;
};

const connectorWrapperOf = (id: string): Element =>
	wrapperOf(
		container.querySelector(
			`polyline[data-kind="connector"][data-id="${id}"]`,
		) as Element,
	);

/** The x / y the connector's hit polyline passes through, as drawn. */
const connectorPointsOf = (id: string): string | null =>
	container
		.querySelector(`polyline[data-kind="connector"][data-id="${id}"]`)
		?.getAttribute("points") ?? null;

describe("ObjectsRenderer - move preview", () => {
	it("gives every object a wrapper that export folds away and that carries no shift outside a drag", () => {
		draw({ r1: makeRect("r1", 0, 0) });

		const wrapper = wrapperOf(probeOf("r1"));
		expect(wrapper.getAttribute("data-canvas-export")).toBe("flatten");
		expect(wrapper.hasAttribute("transform")).toBe(false);
		expect(wrapper.hasAttribute("data-id")).toBe(false);
		expect(wrapper.hasAttribute("data-kind")).toBe(false);
	});

	it("draws a translated object from its start state inside a shifted wrapper, without re-rendering it", () => {
		const startObjects = {
			r1: makeRect("r1", 0, 0),
			r2: makeRect("r2", 100, 0),
		};
		draw(startObjects);
		const startProbe = probeOf("r1");

		for (const delta of [
			{ x: 10, y: 5 },
			{ x: 20.5, y: -7.25 },
		]) {
			draw(
				moveObjects(startObjects, ["r1"], delta),
				previewOf(startObjects, ["r1"], delta),
			);
			expect(probeOf("r1")).toBe(startProbe);
			expect(startProbe.getAttribute("x")).toBe("0");
			expect(wrapperOf(startProbe).getAttribute("transform")).toBe(
				`translate(${delta.x} ${delta.y})`,
			);
		}
		expect(probeRenders.get("r1")).toBe(1);
		expect(wrapperOf(probeOf("r2")).hasAttribute("transform")).toBe(false);
		expect(probeRenders.get("r2")).toBe(1);

		// The drop: the preview goes with the drag, in the same commit as the state.
		draw(moveObjects(startObjects, ["r1"], { x: 20.5, y: -7.25 }));
		expect(probeOf("r1")).toBe(startProbe);
		expect(startProbe.getAttribute("x")).toBe("20.5");
		expect(wrapperOf(startProbe).hasAttribute("transform")).toBe(false);
		expect(probeRenders.get("r1")).toBe(2);
	});

	it("draws an object the preview does not list from its current state", () => {
		const startObjects = { r1: makeRect("r1", 0, 0) };
		draw(startObjects);

		draw(
			moveObjects(startObjects, ["r1"], { x: 10, y: 0 }),
			previewOf(startObjects, [], { x: 10, y: 0 }),
		);

		expect(probeOf("r1").getAttribute("x")).toBe("10");
		expect(wrapperOf(probeOf("r1")).hasAttribute("transform")).toBe(false);
	});

	it("draws a listed object that is still its start state without a shift", () => {
		const startObjects = { r1: makeRect("r1", 0, 0) };

		draw(startObjects, previewOf(startObjects, ["r1"], { x: 10, y: 0 }));

		expect(wrapperOf(probeOf("r1")).hasAttribute("transform")).toBe(false);
	});

	it("draws the object under text edit from its current state", () => {
		const startObjects = { r1: makeRect("r1", 0, 0) };

		draw(
			moveObjects(startObjects, ["r1"], { x: 10, y: 0 }),
			previewOf(startObjects, ["r1"], { x: 10, y: 0 }),
			"r1",
		);

		expect(probeOf("r1").getAttribute("x")).toBe("10");
		expect(wrapperOf(probeOf("r1")).hasAttribute("transform")).toBe(false);
	});
});

describe("ObjectsRenderer - element reuse", () => {
	it("leaves an unchanged object's boundary unvisited and draws a changed one again", () => {
		const startObjects = {
			r1: makeRect("r1", 0, 0),
			r2: makeRect("r2", 100, 0),
		};
		draw(startObjects);
		const shouldComponentUpdate = vi.spyOn(
			ObjectRenderBoundary.prototype,
			"shouldComponentUpdate",
		);
		try {
			draw({ ...startObjects, r2: makeRect("r2", 150, 0) });

			// React bails out on r1's element before reaching its boundary at all.
			expect(
				shouldComponentUpdate.mock.contexts.map(
					(boundary) => (boundary as ObjectRenderBoundary).props.objectId,
				),
			).toEqual(["r2"]);
		} finally {
			shouldComponentUpdate.mockRestore();
		}
		expect(probeRenders.get("r1")).toBe(1);
		expect(probeRenders.get("r2")).toBe(2);
		expect(probeOf("r2").getAttribute("x")).toBe("150");
	});

	it("draws an object again when only its wrapper's shift changes", () => {
		const startObjects = { r1: makeRect("r1", 0, 0) };
		const firstDelta = { x: 10, y: 0 };
		draw(
			moveObjects(startObjects, ["r1"], firstDelta),
			previewOf(startObjects, ["r1"], firstDelta),
		);
		const secondDelta = { x: 20, y: 0 };
		draw(
			moveObjects(startObjects, ["r1"], secondDelta),
			previewOf(startObjects, ["r1"], secondDelta),
		);

		expect(wrapperOf(probeOf("r1")).getAttribute("transform")).toBe(
			"translate(20 0)",
		);
		expect(probeRenders.get("r1")).toBe(1);
	});
});

describe("ObjectsRenderer - move preview of connectors", () => {
	const delta = { x: 40, y: 30 };

	const startScene = (connector: ObjectState): Record<string, ObjectState> => ({
		r1: makeRect("r1", 0, 0),
		r2: makeRect("r2", 200, 0),
		[connector.id]: connector,
	});

	it.each(["straight", "orthogonal"] as const)(
		"shifts a %s connector without vertices whose owners both moved, keeping its start route",
		(routing) => {
			const startObjects = startScene(
				makeConnector("c1", "r1", "r2", { routing }),
			);
			draw(startObjects);
			const startPoints = connectorPointsOf("c1");

			draw(
				moveObjects(startObjects, ["r1", "r2"], delta),
				previewOf(startObjects, ["r1", "r2"], delta),
			);

			expect(connectorWrapperOf("c1").getAttribute("transform")).toBe(
				"translate(40 30)",
			);
			expect(connectorPointsOf("c1")).toBe(startPoints);
		},
	);

	it.each([
		["one of its owners moved", makeConnector("c1", "r1", "r2"), ["r1"]],
		[
			"it stores vertices",
			makeConnector("c1", "r1", "r2", { points: [{ x: 100, y: 100 }] }),
			["r1", "r2"],
		],
	])("draws a connector live when %s", (_case, connector, movedIds) => {
		const startObjects = startScene(connector);
		draw(startObjects);
		const startPoints = connectorPointsOf("c1");

		draw(
			moveObjects(startObjects, movedIds, delta),
			previewOf(startObjects, movedIds, delta),
		);

		expect(connectorWrapperOf("c1").hasAttribute("transform")).toBe(false);
		expect(connectorPointsOf("c1")).not.toBe(startPoints);
	});
});
