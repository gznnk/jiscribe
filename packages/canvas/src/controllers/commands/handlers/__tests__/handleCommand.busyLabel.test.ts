import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canvasToState } from "../../../../states/canvas/CanvasMapper";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ContextMenuHandler } from "../../../gestures/handlers/menu/ContextMenuHandler";
import { ObjectMenuHandler } from "../../../gestures/handlers/menu/ObjectMenuHandler";
import { PropertyPanelHandler } from "../../../gestures/handlers/menu/PropertyPanelHandler";
import { ToolbarHandler } from "../../../gestures/handlers/menu/ToolbarHandler";
import { commandAction } from "../../../gestures/handlers/menu/utils/menuActions";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../gestures/registry/GestureHandlerTypes";
import type { CanvasAction } from "../../../reducer/CanvasActions";
import { createCanvasReducer } from "../../../reducer/canvasReducer";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createCanvasRegistries } from "../../../registries/createCanvasRegistries";
import { initializeCommands } from "../../../registries/initializeCommands";
import {
	buildChainDoc,
	buildCrossingDoc,
	layoutDocOps,
	layoutRegistries,
	runRouteConnectors,
} from "../../arrange/layout/__tests__/support/layoutFixtures";
import { ROUTE_CONNECTORS_COMMAND_ID } from "../../arrange/layout/RouteConnectorsCommand";
import type { ExecutableCommand } from "../../CommandTypes";

const reducer = createCanvasReducer(layoutRegistries);

const routeCommand = layoutRegistries.command.get(
	ROUTE_CONNECTORS_COMMAND_ID,
) as ExecutableCommand;

/**
 * A plugin's commands: a busy one that runs, a busy one executed by a host
 * callback, and one with no busyLabel.
 */
const SLOW_COMMAND: ExecutableCommand = {
	id: "slowThing",
	label: "Slow thing",
	busyLabel: "Working…",
	canExecute: () => true,
	execute: (state) => state,
};

const CALLBACK_COMMAND = {
	id: "callbackThing",
	label: "Callback thing",
	busyLabel: "Working…",
	canExecute: () => true,
};

const QUICK_COMMAND: ExecutableCommand = {
	id: "quickThing",
	label: "Quick thing",
	canExecute: () => true,
	execute: (state) => state,
};

const pluginRegistries = createCanvasRegistries();
initializeCommands(pluginRegistries, undefined, [
	{
		id: "busy-plugin",
		commands: [SLOW_COMMAND, CALLBACK_COMMAND, QUICK_COMMAND],
	},
]);

const createPluginState = (): CanvasControllerState =>
	deepFreezeState(
		createInitialControllerState({ version: 1, root: [] }, pluginRegistries),
	);

const MID_DRAG = { kind: "move" } as unknown as CanvasControllerState["drag"];

const RUN: CanvasAction = { type: "RUN_PENDING_COMMAND" };

const ROUTE_COMMAND: CanvasAction = {
	type: "COMMAND",
	commandId: ROUTE_CONNECTORS_COMMAND_ID,
};

const createState = (
	doc: CanvasDoc = buildCrossingDoc(),
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	deepFreezeState({
		...createInitialControllerState(doc, layoutRegistries),
		...overrides,
	});

const pendingOf = (state: CanvasControllerState): CanvasControllerState =>
	deepFreezeState({
		...state,
		pendingBusyCommandId: ROUTE_CONNECTORS_COMMAND_ID,
	});

/** A drawing whose only connectors are gone, so the command is not offered. */
const buildDocWithoutLine = (): CanvasDoc => {
	const doc = buildChainDoc();
	layoutDocOps.deleteObjects(doc, ["connector-1", "connector-2"]);
	return doc;
};

const clickOf = (targetId: string, commandId: string): CanvasEvent =>
	({
		type: "click",
		targetKind: "menu",
		targetId,
		targetAction: commandAction(commandId),
		button: 0,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const expectNothingRun = (
	result: CanvasControllerState,
	before: CanvasControllerState,
): void => {
	expect(result.objects).toBe(before.objects);
	expect(result.commitVersion).toBe(before.commitVersion);
	expect(result.history.past).toHaveLength(before.history.past.length);
	expect(result.saveRequest).toBe(before.saveRequest);
};

const entries: { name: string; handler: GestureHandler; targetId: string }[] = [
	{
		name: "the panel button",
		handler: PropertyPanelHandler,
		targetId: "property-panel",
	},
	{
		name: "the context menu",
		handler: ContextMenuHandler,
		targetId: "context-menu",
	},
	{ name: "the toolbar", handler: ToolbarHandler, targetId: "toolbar" },
	{
		name: "the object menu",
		handler: ObjectMenuHandler,
		targetId: "object-menu",
	},
];

describe("a command declaring a busyLabel", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe.each(entries)("a press of $name", ({ handler, targetId }) => {
		const press = (state: CanvasControllerState): CanvasControllerState =>
			handler.handle(
				state,
				clickOf(targetId, ROUTE_CONNECTORS_COMMAND_ID),
				layoutRegistries,
			);

		it("records the command as pending and runs nothing", () => {
			const state = createState();
			const executeSpy = vi.spyOn(routeCommand, "execute");

			const result = press(state);

			expect(result.pendingBusyCommandId).toBe(ROUTE_CONNECTORS_COMMAND_ID);
			expect(executeSpy).not.toHaveBeenCalled();
			expectNothingRun(result, state);
		});

		it.each([
			["the entry is disabled", createState(buildDocWithoutLine())],
			[
				"a drag is under way",
				createState(buildCrossingDoc(), { drag: MID_DRAG }),
			],
			[
				"another command is already pending",
				createState(buildCrossingDoc(), { pendingBusyCommandId: "another" }),
			],
		])("records nothing when %s", (_name, state) => {
			const result = press(state);

			expect(result.pendingBusyCommandId).toBe(state.pendingBusyCommandId);
			expectNothingRun(result, state);
		});
	});

	it("runs the pending command once, clears it and is one Undo step", () => {
		const pending = pendingOf(createState());

		const result = reducer(pending, RUN);

		expect(result.pendingBusyCommandId).toBeNull();
		expect(result.commitVersion).toBe(pending.commitVersion + 1);
		expect(result.history.past).toHaveLength(pending.history.past.length + 1);
		expect(result.objects).not.toEqual(pending.objects);
		const undone = reducer(result, { type: "COMMAND", commandId: "undo" });
		expect(undone.objects).toEqual(pending.objects);
	});

	it("runs nothing when nothing is pending", () => {
		const state = createState();

		expect(reducer(state, RUN)).toBe(state);
	});

	it.each([
		[
			"the command is no longer offered",
			() => createState(buildDocWithoutLine()),
		],
		[
			"a drag has started",
			() => createState(buildCrossingDoc(), { drag: MID_DRAG }),
		],
		["the run changes nothing", () => runRouteConnectors(createState())],
	])("clears the pending id and changes nothing when %s", (_name, build) => {
		const pending = pendingOf(build());

		const result = reducer(pending, RUN);

		expect(result.pendingBusyCommandId).toBeNull();
		expectNothingRun(result, pending);
	});

	describe("is cancelled during the wait", () => {
		const replacementDoc = buildChainDoc();
		const payload = canvasToState(
			replacementDoc,
			layoutRegistries.objectMapper,
			layoutRegistries.objectContentResizer,
		);

		it.each([
			["an undo", { type: "COMMAND", commandId: "undo" }],
			[
				"SYNC_EXTERNAL",
				{ type: "SYNC_EXTERNAL", payload, doc: replacementDoc },
			],
			[
				"LOAD_DOCUMENT",
				{ type: "LOAD_DOCUMENT", payload, doc: replacementDoc },
			],
		] as [string, CanvasAction][])("by %s", (_name, action) => {
			const pending = pendingOf(runRouteConnectors(createState()));

			const cancelled = reducer(pending, action);

			expect(cancelled.pendingBusyCommandId).toBeNull();
			expect(reducer(cancelled, RUN)).toBe(cancelled);
		});
	});

	it("a COMMAND action defers a busy command like a menu press", () => {
		const state = createState();
		const executeSpy = vi.spyOn(routeCommand, "execute");

		const result = reducer(state, ROUTE_COMMAND);

		expect(result.pendingBusyCommandId).toBe(ROUTE_CONNECTORS_COMMAND_ID);
		expect(executeSpy).not.toHaveBeenCalled();
		expectNothingRun(result, state);
	});

	it("a COMMAND for a command with no busyLabel runs at once, even while one is pending", () => {
		const executeSpy = vi.spyOn(
			pluginRegistries.command.get(QUICK_COMMAND.id) as ExecutableCommand,
			"execute",
		);
		const pending = deepFreezeState({
			...createPluginState(),
			pendingBusyCommandId: SLOW_COMMAND.id,
		});

		const result = createCanvasReducer(pluginRegistries)(pending, {
			type: "COMMAND",
			commandId: QUICK_COMMAND.id,
		});

		expect(executeSpy).toHaveBeenCalledOnce();
		expect(result.pendingBusyCommandId).toBe(SLOW_COMMAND.id);
	});

	it("serves a plugin's command the same way", () => {
		const executeSpy = vi.spyOn(
			pluginRegistries.command.get(SLOW_COMMAND.id) as ExecutableCommand,
			"execute",
		);

		const pending = PropertyPanelHandler.handle(
			createPluginState(),
			clickOf("property-panel", SLOW_COMMAND.id),
			pluginRegistries,
		);
		expect(pending.pendingBusyCommandId).toBe(SLOW_COMMAND.id);
		expect(executeSpy).not.toHaveBeenCalled();

		const result = createCanvasReducer(pluginRegistries)(pending, RUN);
		expect(executeSpy).toHaveBeenCalledOnce();
		expect(result.pendingBusyCommandId).toBeNull();
	});

	it("runs one without execute through executeCommand, recording nothing", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = PropertyPanelHandler.handle(
			createPluginState(),
			clickOf("property-panel", CALLBACK_COMMAND.id),
			pluginRegistries,
		);

		expect(result.pendingBusyCommandId).toBeNull();
		expect(warn).toHaveBeenCalledWith(
			`Command is callback-executed, not dispatchable: ${CALLBACK_COMMAND.id}`,
		);
	});
});
