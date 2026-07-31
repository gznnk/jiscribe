import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import type { CanvasAction } from "../../CanvasActions";
import { createCanvasReducer } from "../../canvasReducer";

/**
 * The registry bundle the shared test reducer closes over. Exported so tests
 * that need to inspect/spy the exact mapper the reducer uses (e.g. asserting
 * lazy history snapshots never call `objectMapper.toDoc`) can reference the same
 * instance rather than a divergent bundle.
 */
export const testReducerRegistries = createTestRegistries();

const canvasReducer = createCanvasReducer(testReducerRegistries);

/**
 * Fold a sequence of actions through canvasReducer and return the final state, expressing
 * "the result of dispatching in a row" for integration tests. Each step's input state is
 * frozen, so an in-place mutation along the reducer path is detected.
 */
export const applyActions = (
	state: CanvasControllerState,
	actions: CanvasAction[],
): CanvasControllerState =>
	actions.reduce(
		(current, action) => canvasReducer(deepFreezeState(current), action),
		state,
	);

/** Small factory for a COMMAND action. */
export const command = (commandId: string): CanvasAction => ({
	type: "COMMAND",
	commandId,
});

/**
 * Sugar for running several commands in order by id.
 * e.g. runCommands(state, "move-right", "move-right", "undo")
 */
export const runCommands = (
	state: CanvasControllerState,
	...commandIds: string[]
): CanvasControllerState => applyActions(state, commandIds.map(command));
