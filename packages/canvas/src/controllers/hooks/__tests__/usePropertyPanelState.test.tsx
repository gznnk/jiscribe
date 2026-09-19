// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { usePropertyPanelState } from "../usePropertyPanelState";

/**
 * The hook is a latch: it hands the sidebar the same state object until
 * something the sidebar shows has changed. What counts as such a change is the
 * whole contract, so each case here is one kind of dispatch and whether the
 * reference moves.
 */

const rectAt = (id: string, cx: number, parentId?: string): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy: 0,
		width: 10,
		height: 10,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		...(parentId === undefined ? {} : { parentId }),
	}) as unknown as ObjectState;

const groupOf = (id: string, childIds: string[]): ObjectState =>
	({
		id,
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 10,
		height: 10,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const baseState = (): CanvasControllerState => {
	const initial = createInitialControllerState(
		{ version: 1, root: [] } as unknown as CanvasDoc,
		createTestRegistries(),
	);
	return {
		...initial,
		objects: {
			selected: rectAt("selected", 0),
			other: rectAt("other", 100),
			group: groupOf("group", ["child"]),
			child: rectAt("child", 50, "group"),
		},
		rootIds: ["selected", "other", "group"],
		selectedIds: ["selected"],
	};
};

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	for (const root of roots) {
		root.unmount();
	}
	roots.length = 0;
});

/** Mounts the hook and returns a way to re-render it with another state, reading back what it returned. */
const mount = (initial: CanvasControllerState) => {
	let returned: CanvasControllerState | null = null;
	const Probe: React.FC<{ state: CanvasControllerState }> = ({ state }) => {
		returned = usePropertyPanelState(state);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (state: CanvasControllerState): CanvasControllerState => {
		act(() => {
			root.render(<Probe state={state} />);
		});
		return returned as unknown as CanvasControllerState;
	};
	return { first: render(initial), render };
};

describe("usePropertyPanelState", () => {
	it("hands out the state it was first given", () => {
		const initial = baseState();
		const { first } = mount(initial);
		expect(first).toBe(initial);
	});

	it("keeps the previous state through a pan, which changes only the viewport", () => {
		const initial = baseState();
		const { first, render } = mount(initial);
		const panned = {
			...initial,
			viewport: { ...initial.viewport, minX: initial.viewport.minX + 10 },
		};
		expect(render(panned)).toBe(first);
	});

	it("keeps the previous state when only an object outside the selection moves", () => {
		const initial = baseState();
		const { first, render } = mount(initial);
		const otherMoved = {
			...initial,
			objects: { ...initial.objects, other: rectAt("other", 200) },
		};
		expect(render(otherMoved)).toBe(first);
	});

	it("moves to the new state when the selected object changes", () => {
		const initial = baseState();
		const { render } = mount(initial);
		const selectedMoved = {
			...initial,
			objects: { ...initial.objects, selected: rectAt("selected", 5) },
		};
		expect(render(selectedMoved)).toBe(selectedMoved);
	});

	it("moves to the new state when the selection changes", () => {
		const initial = baseState();
		const { render } = mount(initial);
		const reselected = { ...initial, selectedIds: ["other"] };
		expect(render(reselected)).toBe(reselected);
	});

	it("moves to the new state when a descendant of a selected group changes", () => {
		const initial = { ...baseState(), selectedIds: ["group"] };
		const { first, render } = mount(initial);
		const childMoved = {
			...initial,
			objects: { ...initial.objects, child: rectAt("child", 60, "group") },
		};
		expect(render(childMoved)).toBe(childMoved);
		expect(render(childMoved)).not.toBe(first);
	});

	it("follows the selected connector rather than selectedIds", () => {
		const initial = {
			...baseState(),
			selectedIds: [],
			selectedConnectorId: "other",
		};
		const { first, render } = mount(initial);
		const connectorChanged = {
			...initial,
			objects: { ...initial.objects, other: rectAt("other", 300) },
		};
		expect(render(connectorChanged)).not.toBe(first);
	});

	it("moves to the new state on the sidebar's own changes: collapse, background, text edit", () => {
		const initial = baseState();
		const { render } = mount(initial);
		const collapsed = {
			...initial,
			propertyPanel: {
				...initial.propertyPanel,
				collapsedSectionIds: ["text"],
			},
		};
		expect(render(collapsed)).toBe(collapsed);
		const recolored = { ...collapsed, background: "#123456" };
		expect(render(recolored)).toBe(recolored);
		const editing = {
			...recolored,
			textEditState: { kind: "shape", objectId: "selected", slotId: "main" },
		} as unknown as CanvasControllerState;
		expect(render(editing)).toBe(editing);
	});

	it("latches again after a change, so the next pan holds the latest state", () => {
		const initial = baseState();
		const { render } = mount(initial);
		const reselected = { ...initial, selectedIds: ["other"] };
		render(reselected);
		const panned = {
			...reselected,
			viewport: { ...reselected.viewport, minX: 99 },
		};
		expect(render(panned)).toBe(reselected);
	});
});
