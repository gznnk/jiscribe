import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { CanvasRegistries } from "../../../registries/CanvasRegistries";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { handleCommand } from "../../handlers/handleCommand";

/**
 * Run one command through handleCommand, the same entry the ObjectMenu and keyboard use, so
 * the real path — CommandRegistry resolution, the canExecute gate and execute — is covered.
 * The input state is frozen first, so an in-place mutation by the command is detected.
 *
 * @param state - Frozen before dispatch, so it must not be reused expecting mutation
 * @param commandId - Resolved through CommandRegistry. An unknown id, a callback-executed one
 *   such as paste, or one whose canExecute is false all return the state unchanged rather than
 *   throwing, so a test must assert on the state rather than expect a rejection
 * @param registries - Defaults to the full bundle (createTestRegistries); pass one only when the
 *   test exercises a specific config
 * @returns The state after the command, or the input state when the command did not run
 */
export const runCommand = (
	state: CanvasControllerState,
	commandId: string,
	registries: CanvasRegistries = createTestRegistries(),
): CanvasControllerState =>
	handleCommand(deepFreezeState(state), commandId, registries);
