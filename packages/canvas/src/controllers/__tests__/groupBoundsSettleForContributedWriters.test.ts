import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../CanvasTypes";
import { handleCommand } from "../commands/handlers/handleCommand";
import { handleGesture } from "../gestures/handlers/handleGesture";
import type { Gesture } from "../gestures/recognizer/GestureRecognizerTypes";
import { createInitialControllerState } from "../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { createTestRegistries } from "../registries/createCanvasRegistries";
import { selectionOf } from "../selection/__tests__/support/selectionOf";
import type { SelectionControlDefinition } from "../ui/controls/SelectionControlTypes";

/**
 * The two channels a plugin writes an object through — a contributed command and
 * a type's selection control — settling the group frames above what they wrote.
 *
 * Both write a box they derived themselves, which is what makes them worth a
 * test of their own: the content-resizer pass settles the ancestors only for the
 * boxes it moved, so an already-derived one used to leave the group behind. That
 * is how it showed up: a shape inside a group edited by a contributed command or
 * a selection control left the group's frame at its old size, while the same
 * edit made by a core writer that names its ids settled it.
 */

const emptyDoc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;

/** The action the control below renders, which is what routes the gesture to it. */
const CONTROL_ACTION = "selection:rect:probe";

/** The id of the contributed command registered below. */
const COMMAND_ID = "probe.growChild";

const GROUP_ID = "g1";
const CHILD_ID = "r1";

/** The child's box before either writer runs, and the group's frame around it. */
const START_HEIGHT = 40;
/** What both writers grow the child to, deriving the new box themselves. */
const GROWN_HEIGHT = 140;

/** The child grown downward, exactly as a writer settling its own box hands it over. */
const growChild = (child: ObjectState): ObjectState =>
	({
		...child,
		cy:
			(child as unknown as { cy: number }).cy +
			(GROWN_HEIGHT - START_HEIGHT) / 2,
		height: GROWN_HEIGHT,
	}) as ObjectState;

/** One rect inside one group, the group's frame already fitting the rect. */
const stateWithGroupedRect = (
	registries: CanvasRegistries,
): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	const child = {
		id: CHILD_ID,
		type: "rect",
		cx: 100,
		cy: 100,
		width: 40,
		height: START_HEIGHT,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId: GROUP_ID,
	} as unknown as ObjectState;
	const group = {
		id: GROUP_ID,
		type: "group",
		childIds: [CHILD_ID],
		cx: 100,
		cy: 100,
		width: 40,
		height: START_HEIGHT,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	} as unknown as ObjectState;
	return {
		...base,
		objects: { ...base.objects, [GROUP_ID]: group, [CHILD_ID]: child },
		rootIds: [...base.rootIds, GROUP_ID],
		selection: selectionOf([CHILD_ID]),
	};
};

/** The group's cached height, which is where a stale frame shows up. */
const groupHeight = (state: CanvasControllerState): number =>
	(state.objects[GROUP_ID] as unknown as { height: number }).height;

/** A drag gesture aimed at the selection control, with the fields the route reads. */
const controlDrag = (type: "dragStart" | "dragEnd"): Gesture =>
	({
		type,
		button: 0,
		targetKind: "control",
		targetId: CHILD_ID,
		targetAction: CONTROL_ACTION,
		start: { x: 100, y: 100 },
		last: { x: 100, y: 200 },
		clientLast: { x: 100, y: 200 },
		delta: { x: 0, y: 100 },
		clientDelta: { x: 0, y: 100 },
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

/**
 * Drives one whole drag of the selection control: dragStart takes the snapshot
 * the control reads its start object from, dragEnd is where it writes.
 */
const dragControl = (
	state: CanvasControllerState,
	registries: CanvasRegistries,
): CanvasControllerState => {
	const started = handleGesture(state, controlDrag("dragStart"), registries);
	return handleGesture(started, controlDrag("dragEnd"), registries);
};

const growOnDrag: SelectionControlDefinition["handle"] = (context) =>
	growChild(context.startObject);

describe("group bounds settle for contributed writers", () => {
	it("a contributed command's already-derived box → the group frame follows", () => {
		const registries = createTestRegistries();
		registries.command.register({
			id: COMMAND_ID,
			label: "Grow child",
			canExecute: () => true,
			execute: (state) => ({
				...state,
				objects: {
					...state.objects,
					[CHILD_ID]: growChild(state.objects[CHILD_ID]),
				},
				commitVersion: state.commitVersion + 1,
			}),
		});
		const state = stateWithGroupedRect(registries);
		expect(groupHeight(state)).toBe(START_HEIGHT);

		const next = handleCommand(state, COMMAND_ID, registries);

		expect(groupHeight(next)).toBe(GROWN_HEIGHT);
	});

	it("a command that changed nothing → the state comes back untouched", () => {
		const registries = createTestRegistries();
		registries.command.register({
			id: COMMAND_ID,
			label: "Do nothing",
			canExecute: () => true,
			execute: (state) => state,
		});
		const state = stateWithGroupedRect(registries);

		expect(handleCommand(state, COMMAND_ID, registries)).toBe(state);
	});

	it("a selection control's already-derived box → the group frame follows", () => {
		const registries = createTestRegistries();
		registries.selectionControl.register("rect", [
			{
				name: "probe",
				Component: () => null,
				handle: growOnDrag,
			},
		]);
		const state = stateWithGroupedRect(registries);
		expect(groupHeight(state)).toBe(START_HEIGHT);

		const next = dragControl(state, registries);

		expect(groupHeight(next)).toBe(GROWN_HEIGHT);
	});

	it("a selection control reporting no change → no group frame is rewritten", () => {
		const registries = createTestRegistries();
		registries.selectionControl.register("rect", [
			{
				name: "probe",
				Component: () => null,
				handle: () => null,
			},
		]);
		const state = stateWithGroupedRect(registries);

		const next = dragControl(state, registries);

		expect(next.objects[GROUP_ID]).toBe(state.objects[GROUP_ID]);
	});
});
