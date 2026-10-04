import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
} from "../../../ui/controls/SelectionControlTypes";
import type { CanvasEvent } from "../GestureHandlerTypes";
import { createRegisteredSelectionControl } from "../RegisteredSelectionControl";

const makeObject = (overrides: Partial<ObjectState> = {}): ObjectState =>
	({ id: "obj-1", type: "container", ...overrides }) as unknown as ObjectState;

/** State whose current frame and start snapshot both hold an object under obj-1. */
const makeState = (
	object: ObjectState,
	snapshotObject: ObjectState = object,
): CanvasControllerState =>
	({
		objects: { "obj-1": object },
		selection: { objectIds: ["obj-1"], part: null },
		activeDrag: {
			startSnapshot: { objects: { "obj-1": snapshotObject } },
			kind: "other",
		},
	}) as unknown as CanvasControllerState;

/** The same state with one part picked below the object. */
const withPart = (
	state: CanvasControllerState,
	part: CanvasControllerState["selection"]["part"],
): CanvasControllerState => ({
	...state,
	selection: { ...state.selection, part },
});

/** State with the current frame but no gesture-start snapshot. */
const makeStateWithoutSnapshot = (object: ObjectState): CanvasControllerState =>
	({
		objects: { "obj-1": object },
		activeDrag: undefined,
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "dragStart" | "drag" | "dragEnd" | "click",
	overrides: Partial<CanvasEvent> = {},
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: "obj-1",
		targetPart: "selection:container:headerHeight",
		button: 0,
		start: { x: 0, y: 0 },
		last: { x: 0, y: 0 },
		delta: { x: 0, y: 0 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
		...overrides,
	}) as unknown as CanvasEvent;

/** A definition that stamps `marked` on the object it is given. */
const markingDefinition = (): SelectionControlDefinition => ({
	name: "headerHeight",
	Component: () => null,
	handle: (context) => ({
		object: { ...context.startObject, marked: true } as unknown as ObjectState,
	}),
});

const noChangeDefinition = (): SelectionControlDefinition => ({
	name: "headerHeight",
	Component: () => null,
	handle: () => null,
});

const marked = (state: CanvasControllerState): boolean =>
	(state.objects["obj-1"] as { marked?: boolean }).marked === true;

describe("SelectionControlStrategy (via createRegisteredSelectionControl)", () => {
	it("dragStart resets UI state and never calls the definition", () => {
		const handle = vi.fn();
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle,
		});
		const next = strategy.handle(
			makeState(makeObject()),
			makeEvent("dragStart"),
			undefined as never,
		);
		expect(handle).not.toHaveBeenCalled();
		expect(next.edgeScrollEnabled).toBe(true);
		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("drag writes the definition's result back via COW", () => {
		const { strategy } = createRegisteredSelectionControl(
			"container",
			markingDefinition(),
		);
		const state = makeState(makeObject());
		const next = strategy.handle(state, makeEvent("drag"), undefined as never);
		expect(marked(next)).toBe(true);
		expect(next.objects).not.toBe(state.objects);
		expect(next.edgeScrollEnabled).toBeUndefined();
	});

	it("dragEnd writes the result back and disables edge scrolling", () => {
		const { strategy } = createRegisteredSelectionControl(
			"container",
			markingDefinition(),
		);
		const next = strategy.handle(
			makeState(makeObject()),
			makeEvent("dragEnd"),
			undefined as never,
		);
		expect(marked(next)).toBe(true);
		expect(next.edgeScrollEnabled).toBe(false);
	});

	it("drag leaves state untouched when the definition reports no change", () => {
		const { strategy } = createRegisteredSelectionControl(
			"container",
			noChangeDefinition(),
		);
		const state = makeState(makeObject());
		const next = strategy.handle(state, makeEvent("drag"), undefined as never);
		expect(next).toBe(state);
	});

	it("guards a missing start snapshot (drag returns state unchanged)", () => {
		const handle = vi.fn();
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle,
		});
		const state = makeStateWithoutSnapshot(makeObject());
		const next = strategy.handle(state, makeEvent("drag"), undefined as never);
		expect(handle).not.toHaveBeenCalled();
		expect(next).toBe(state);
	});

	it("still disables edge scrolling on dragEnd when a guard fails", () => {
		const { strategy } = createRegisteredSelectionControl(
			"container",
			markingDefinition(),
		);
		const state = makeStateWithoutSnapshot(makeObject());
		const next = strategy.handle(
			state,
			makeEvent("dragEnd"),
			undefined as never,
		);
		expect(marked(next)).toBe(false);
		expect(next.edgeScrollEnabled).toBe(false);
	});

	it("guards a snapshot type mismatch", () => {
		const handle = vi.fn();
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle,
		});
		const state = makeState(makeObject(), makeObject({ type: "rect" }));
		const next = strategy.handle(state, makeEvent("drag"), undefined as never);
		expect(handle).not.toHaveBeenCalled();
		expect(next).toBe(state);
	});

	it("guards an object missing from the current frame", () => {
		const handle = vi.fn();
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle,
		});
		const state = {
			objects: {},
			activeDrag: {
				startSnapshot: { objects: { "obj-1": makeObject() } },
				kind: "other",
			},
		} as unknown as CanvasControllerState;
		const next = strategy.handle(state, makeEvent("drag"), undefined as never);
		expect(handle).not.toHaveBeenCalled();
		expect(next).toBe(state);
	});

	it("ignores an event kind the definition did not ask for (state unchanged)", () => {
		const handle = vi.fn();
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle,
		});
		const state = makeState(makeObject());
		const next = strategy.handle(state, makeEvent("click"), undefined as never);
		expect(handle).not.toHaveBeenCalled();
		expect(next).toBe(state);
	});

	it("passes undefined subPart for an exact-match data-part", () => {
		let received: SelectionControlEvent | undefined;
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle: (context: SelectionControlContext, event) => {
				received = event;
				return { object: context.startObject };
			},
		});
		strategy.handle(
			makeState(makeObject()),
			makeEvent("drag", { targetPart: "selection:container:headerHeight" }),
			undefined as never,
		);
		expect(received?.subPart).toBeUndefined();
	});

	it("parses the sub-segment after the control part into subPart", () => {
		let received: SelectionControlEvent | undefined;
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			Component: () => null,
			handle: (context: SelectionControlContext, event) => {
				received = event;
				return { object: context.startObject };
			},
		});
		strategy.handle(
			makeState(makeObject()),
			makeEvent("drag", { targetPart: "selection:container:headerHeight:3" }),
			undefined as never,
		);
		expect(received?.subPart).toBe("3");
	});

	it("routes a click to a definition that asked for it", () => {
		const { strategy } = createRegisteredSelectionControl("container", {
			...markingDefinition(),
			events: ["click", "drag", "dragEnd"],
		});
		const state = makeState(makeObject());
		const next = strategy.handle(state, makeEvent("click"), undefined as never);
		expect(marked(next)).toBe(true);
	});

	it("gives a click the current frame as its own start object", () => {
		let received: SelectionControlContext | undefined;
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			events: ["click"],
			Component: () => null,
			handle: (context: SelectionControlContext) => {
				received = context;
				return null;
			},
		});
		// The snapshot holds a different object, so a leaked drag path would show.
		const state = makeState(makeObject(), makeObject({ id: "stale" }));
		strategy.handle(state, makeEvent("click"), undefined as never);
		expect(received?.startObject).toBe(received?.object);
		expect(received?.object).toBe(state.objects["obj-1"]);
	});

	it("handles a click with no active drag at all", () => {
		const handle = vi.fn(() => null);
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			events: ["click"],
			Component: () => null,
			handle,
		});
		strategy.handle(
			makeStateWithoutSnapshot(makeObject()),
			makeEvent("click"),
			undefined as never,
		);
		expect(handle).toHaveBeenCalledTimes(1);
	});

	it("installs a returned part selection under the control's own object id", () => {
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			events: ["click"],
			Component: () => null,
			handle: () => ({
				selection: {
					kind: "tail",
					ranges: [{ anchorId: "tip", focusId: "tip" }],
				},
			}),
		});
		const state = makeState(makeObject());
		const next = strategy.handle(state, makeEvent("click"), undefined as never);
		expect(next.selection.part).toEqual({
			kind: "tail",
			ranges: [{ anchorId: "tip", focusId: "tip" }],
		});
		// Nothing was written to the objects map.
		expect(next.objects).toBe(state.objects);
	});

	it("clears the part selection for a null selection and leaves it for an omitted one", () => {
		const selected = {
			kind: "tail",
			ranges: [{ anchorId: "tip", focusId: "tip" }],
		};
		const clearing = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			events: ["click"],
			Component: () => null,
			handle: () => ({ selection: null }),
		}).strategy;
		const cleared = clearing.handle(
			withPart(makeState(makeObject()), selected),
			makeEvent("click"),
			undefined as never,
		);
		expect(cleared.selection.part).toBeNull();

		const keeping = createRegisteredSelectionControl("container", {
			...markingDefinition(),
			events: ["click"],
		}).strategy;
		const kept = keeping.handle(
			withPart(makeState(makeObject()), selected),
			makeEvent("click"),
			undefined as never,
		);
		expect(kept.selection.part).toBe(selected);
	});
});
