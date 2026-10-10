import { describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ObjectPartSelection } from "../../../selection/CanvasSelection";
import type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
} from "../../../ui/controls/SelectionControlTypes";
import type { CanvasEvent } from "../GestureHandlerTypes";
import {
	createRegisteredSelectionControl,
	DEFAULT_SELECTION_CONTROL_EVENTS,
} from "../RegisteredSelectionControl";

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
		commitVersion: 0,
		activeDrag: {
			startSnapshot: { objects: { "obj-1": snapshotObject } },
			kind: "other",
		},
	}) as unknown as CanvasControllerState;

/** State with the current frame but no gesture-start snapshot. */
const makeStateWithoutSnapshot = (object: ObjectState): CanvasControllerState =>
	({
		objects: { "obj-1": object },
		selection: { objectIds: ["obj-1"], part: null },
		commitVersion: 0,
		activeDrag: undefined,
	}) as unknown as CanvasControllerState;

const makeEvent = (
	type: "dragStart" | "drag" | "dragEnd" | "click" | "doubleClick",
	overrides: Partial<CanvasEvent> = {},
): CanvasEvent =>
	({
		type,
		targetKind: "control",
		targetId: "obj-1",
		targetAction: "selection:container:headerHeight",
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

	it("commits once at dragEnd when the definition returns an object, never on drag", () => {
		const { strategy } = createRegisteredSelectionControl(
			"container",
			markingDefinition(),
		);
		const state = { ...makeState(makeObject()), commitVersion: 3 };
		const dragged = strategy.handle(
			state,
			makeEvent("drag"),
			undefined as never,
		);
		expect(dragged.commitVersion).toBe(3);
		const ended = strategy.handle(
			dragged,
			makeEvent("dragEnd"),
			undefined as never,
		);
		expect(ended.commitVersion).toBe(4);
	});

	it("commits nothing at dragEnd when the definition reports no change", () => {
		const { strategy } = createRegisteredSelectionControl(
			"container",
			noChangeDefinition(),
		);
		const state = { ...makeState(makeObject()), commitVersion: 3 };
		const next = strategy.handle(
			state,
			makeEvent("dragEnd"),
			undefined as never,
		);
		expect(next.objects).toBe(state.objects);
		expect(next.edgeScrollEnabled).toBe(false);
		expect(next.commitVersion).toBe(3);
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

	it("ignores a click the definition did not ask for (state unchanged)", () => {
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

	it("passes undefined subAction for an exact-match data-action", () => {
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
			makeEvent("drag", { targetAction: "selection:container:headerHeight" }),
			undefined as never,
		);
		expect(received?.subAction).toBeUndefined();
	});

	it("parses the sub-segment after the control action into subAction", () => {
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
			makeEvent("drag", { targetAction: "selection:container:headerHeight:3" }),
			undefined as never,
		);
		expect(received?.subAction).toBe("3");
	});

	it("defaults to the drag pair when the definition names no events", () => {
		expect(DEFAULT_SELECTION_CONTROL_EVENTS).toEqual(["drag", "dragEnd"]);
	});

	it("routes a click to a definition that asked for it and commits its object", () => {
		const { strategy } = createRegisteredSelectionControl("container", {
			...markingDefinition(),
			events: ["click", "drag", "dragEnd"],
		});
		const state = makeState(makeObject());
		const next = strategy.handle(state, makeEvent("click"), undefined as never);
		expect(marked(next)).toBe(true);
		expect(next.commitVersion).toBe(state.commitVersion + 1);
	});

	it("hands a click the current frame as its start object, with no drag under way", () => {
		let received: SelectionControlContext | undefined;
		let receivedEvent: SelectionControlEvent | undefined;
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			events: ["doubleClick"],
			Component: () => null,
			handle: (context: SelectionControlContext, event) => {
				received = context;
				receivedEvent = event;
				return null;
			},
		});
		const state = makeStateWithoutSnapshot(makeObject());
		const next = strategy.handle(
			state,
			makeEvent("doubleClick", { last: { x: 5, y: 6 } }),
			undefined as never,
		);
		expect(next).toBe(state);
		expect(received?.object).toBe(state.objects["obj-1"]);
		expect(received?.startObject).toBe(received?.object);
		expect(receivedEvent).toEqual({
			type: "doubleClick",
			last: { x: 5, y: 6 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
			subAction: undefined,
		});
	});

	it("releases edge scrolling on dragEnd even for a definition that did not ask for it", () => {
		const handle = vi.fn();
		const { strategy } = createRegisteredSelectionControl("container", {
			name: "headerHeight",
			events: ["click"],
			Component: () => null,
			handle,
		});
		const next = strategy.handle(
			{ ...makeState(makeObject()), edgeScrollEnabled: true },
			makeEvent("dragEnd"),
			undefined as never,
		);
		expect(handle).not.toHaveBeenCalled();
		expect(next.edgeScrollEnabled).toBe(false);
	});

	describe("part selection", () => {
		const tailPart: ObjectPartSelection = {
			kind: "tail",
			ranges: [{ anchorId: "tip", focusId: "tip" }],
		};

		const selectingStrategy = (selection: ObjectPartSelection | null) =>
			createRegisteredSelectionControl("container", {
				name: "headerHeight",
				events: ["click"],
				Component: () => null,
				handle: () => ({ selection }),
			}).strategy;

		it("installs a returned part on the control's object without writing or committing", () => {
			const state = makeState(makeObject());
			const next = selectingStrategy(tailPart).handle(
				state,
				makeEvent("click"),
				undefined as never,
			);
			expect(next.selection).toEqual({ objectIds: ["obj-1"], part: tailPart });
			expect(next.objects).toBe(state.objects);
			expect(next.commitVersion).toBe(state.commitVersion);
		});

		it("clears the part for a null selection and keeps it for an omitted one", () => {
			const state = {
				...makeState(makeObject()),
				selection: { objectIds: ["obj-1"], part: tailPart },
			};
			const cleared = selectingStrategy(null).handle(
				state,
				makeEvent("click"),
				undefined as never,
			);
			expect(cleared.selection.part).toBeNull();

			const kept = createRegisteredSelectionControl("container", {
				...markingDefinition(),
				events: ["click"],
			}).strategy.handle(state, makeEvent("click"), undefined as never);
			expect(kept.selection).toBe(state.selection);
		});

		it("writes no part when the control's object is not the sole selection", () => {
			const state = {
				...makeState(makeObject()),
				selection: { objectIds: ["obj-1", "obj-2"], part: null },
			};
			const next = selectingStrategy(tailPart).handle(
				state,
				makeEvent("click"),
				undefined as never,
			);
			expect(next).toBe(state);
		});
	});
});
