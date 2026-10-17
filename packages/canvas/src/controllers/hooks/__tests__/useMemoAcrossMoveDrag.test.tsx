// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type {
	ActiveDrag,
	CanvasControllerState,
	DragKind,
} from "../../CanvasTypes";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { useMemoAcrossMoveDrag } from "../useMemoAcrossMoveDrag";

const rectAt = (cx: number): ObjectState =>
	({
		id: "rect",
		type: "rect",
		cx,
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
		objects: { rect: rectAt(0) },
		rootIds: ["rect"],
		selection: selectionOf(["rect"]),
	};
};

const dragOf = (kind: DragKind): ActiveDrag =>
	({ startSnapshot: {}, kind }) as unknown as ActiveDrag;

/** The state one frame of a drag of `kind` produces: the rect moved, the rest as given. */
const draggedTo = (
	state: CanvasControllerState,
	kind: DragKind | null,
	cx: number,
): CanvasControllerState => ({
	...state,
	objects: { rect: rectAt(cx) },
	activeDrag: kind === null ? null : dragOf(kind),
});

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	for (const root of roots) {
		root.unmount();
	}
	roots.length = 0;
});

/** Mounts the hook with a build that counts its calls and returns a fresh object each time. */
const mount = (initial: CanvasControllerState) => {
	let builds = 0;
	let returned: object | null = null;
	const Probe: React.FC<{ state: CanvasControllerState }> = ({ state }) => {
		returned = useMemoAcrossMoveDrag(state, () => {
			builds += 1;
			return {};
		}, [state.selection]);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (state: CanvasControllerState): object => {
		act(() => {
			root.render(<Probe state={state} />);
		});
		return returned as unknown as object;
	};
	const first = render(initial);
	return { first, render, countBuilds: () => builds };
};

describe("useMemoAcrossMoveDrag", () => {
	it("builds once while neither the objects nor the deps change", () => {
		const initial = baseState();
		const { first, render, countBuilds } = mount(initial);
		expect(render({ ...initial })).toBe(first);
		expect(countBuilds()).toBe(1);
	});

	it("rebuilds when the objects change outside a drag", () => {
		const initial = baseState();
		const { first, render } = mount(initial);
		expect(render(draggedTo(initial, null, 5))).not.toBe(first);
	});

	it("holds the value through the frames of a move drag", () => {
		const initial = baseState();
		const { render, countBuilds } = mount(initial);
		const atDragStart = render(draggedTo(initial, "move", 1));
		expect(render(draggedTo(initial, "move", 2))).toBe(atDragStart);
		expect(render(draggedTo(initial, "move", 3))).toBe(atDragStart);
		expect(countBuilds()).toBe(1);
	});

	it("rebuilds on every frame of a transform drag", () => {
		const initial = baseState();
		const { first, render } = mount(initial);
		const frame1 = render(draggedTo(initial, "transform", 1));
		expect(frame1).not.toBe(first);
		expect(render(draggedTo(initial, "transform", 2))).not.toBe(frame1);
	});

	it("rebuilds mid-move when a dep changes", () => {
		const initial = baseState();
		const { first, render } = mount(initial);
		const reselected = {
			...draggedTo(initial, "move", 1),
			selection: selectionOf(["rect"]),
		};
		expect(render(reselected)).not.toBe(first);
	});

	it("rebuilds once the move drag ends with the objects it left", () => {
		const initial = baseState();
		const { render } = mount(initial);
		const midDrag = render(draggedTo(initial, "move", 1));
		expect(render(draggedTo(initial, "move", 2))).toBe(midDrag);
		expect(render(draggedTo(initial, null, 2))).not.toBe(midDrag);
	});
});
