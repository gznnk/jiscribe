import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../registries/ICanvasRegistries";
import { reconcileGroupBounds } from "../../utils/reconcileGroupBounds";

type RegisteredCommand = NonNullable<
	ReturnType<ICanvasRegistries["command"]["get"]>
>;

/**
 * Whether a command with an `execute` may run now: no drag refuses it, and its
 * `canExecute` passes. Only a `"view"` command runs while a drag is under way.
 * Every drag frame is rebuilt from the drag's start snapshot, so anything else
 * a command changes mid-drag — the objects, or the selection the drag reads —
 * is discarded or misapplied on the next frame while its commit stays in the
 * history; a command without a category (a plugin's commonly has none) is
 * refused with the rest. The drag is judged here rather than in `canExecute`,
 * so a shortcut the canvas claims is still swallowed rather than falling
 * through to the browser (same split as canNavigateHistory).
 */
const isCommandRunnable = (
	state: CanvasControllerState,
	command: RegisteredCommand,
	registries: ICanvasRegistries,
): boolean =>
	(state.drag === null || command.category === "view") &&
	command.canExecute(state, registries);

/**
 * Handles a press of a command from any entry: the COMMAND action (a shortcut,
 * a host's dispatch) and the menu gesture handlers alike. Runs it through
 * executeCommand, except one declaring a `busyLabel`: that one is recorded as
 * `pendingBusyCommandId` for useRunPendingCommand to run once its indicator is
 * on screen. A busy command isCommandRunnable refuses, or one pressed while a
 * command is pending, records nothing.
 */
export const handleCommand = (
	state: CanvasControllerState,
	commandId: string,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const command = registries.command.get(commandId);
	if (command?.busyLabel === undefined || command.execute === undefined) {
		return executeCommand(state, commandId, registries);
	}
	if (
		state.pendingBusyCommandId !== null ||
		!isCommandRunnable(state, command, registries)
	) {
		return state;
	}
	return { ...state, pendingBusyCommandId: commandId };
};

/**
 * Runs a command now, `busyLabel` or not: handleCommand's path for every other
 * command, and RUN_PENDING_COMMAND's for the pending one.
 * Executes the Command registered in the canvas's command registry and returns a
 * new CanvasControllerState. History recording is delegated to canvasReducer.
 * Command lookup and execution both flow through the passed-in `registries` (#165).
 *
 * The ancestor group frames are settled on the way out, so a command is free to
 * hand back an object whose box it derived itself — which the built-in ones that
 * name their own ids do not need, and a contributed one has no way to do
 * (see reconcileGroupBounds).
 *
 * Whether the command runs is isCommandRunnable's answer, the drag rule
 * included. Escape mid-marquee does not come here: it is taken as CANCEL_DRAG
 * instead (useKeyboardShortcuts).
 */
export const executeCommand = (
	state: CanvasControllerState,
	commandId: string,
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const command = registries.command.get(commandId);

	if (!command) {
		console.warn(`Command not found: ${commandId}`);
		return state;
	}

	if (!command.execute) {
		// Callback-executed command (definition-only registration, e.g. paste):
		// reaching here means a caller dispatched COMMAND without wiring the callback.
		console.warn(
			`Command is callback-executed, not dispatchable: ${commandId}`,
		);
		return state;
	}

	if (!isCommandRunnable(state, command, registries)) {
		return state;
	}

	return reconcileGroupBounds(command.execute(state, registries), state);
};
