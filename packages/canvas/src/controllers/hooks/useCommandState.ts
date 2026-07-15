import type { CanvasControllerState } from "../CanvasTypes";
import type { Command } from "../commands/CommandTypes";
import { useCanvasRegistries } from "../contexts/CanvasRegistriesContext";
import type { CanvasRegistries } from "../setup/CanvasRegistries";

/** A resolved command paired with whether it can currently run. */
export type ResolvedCommandState = {
	command: Command;
	enabled: boolean;
};

/**
 * Looks up a command by id and evaluates its `canExecute` against the current
 * state. Returns null when the id is not registered (e.g. a command disabled by
 * `CanvasConfig.commands`), so callers can skip rendering it.
 *
 * Pure counterpart of {@link useCommandState}: takes the bundle explicitly so it
 * is usable where the registries are held directly (e.g. `Canvas.tsx`, which
 * provides the context and therefore cannot read it back via a hook).
 */
export const resolveCommandState = (
	state: CanvasControllerState,
	registries: CanvasRegistries,
	commandId: string,
): ResolvedCommandState | null => {
	const command = registries.command.get(commandId);
	if (!command) {
		return null;
	}
	return { command, enabled: command.canExecute(state, registries) };
};

/**
 * Resolves command availability for the surrounding `<Canvas>`.
 *
 * Reads the registry bundle from context once and returns a resolver bound to
 * the given state, so components can look up one command or map over many (menus)
 * without each grabbing `useCanvasRegistries()` and threading the bundle back
 * into `canExecute`. Mirrors {@link useMenuSections} (pure function + thin hook).
 *
 * The resolver is a plain closure, not `useCallback`-memoized: `state` changes on
 * nearly every dispatch, so memoizing on `[state, registries]` would rebuild the
 * callback almost every render anyway, and no consumer depends on its identity
 * (it is only called during render, never passed to a memo/effect dependency).
 */
export const useCommandState = (
	state: CanvasControllerState,
): ((commandId: string) => ResolvedCommandState | null) => {
	const registries = useCanvasRegistries();
	return (commandId: string) =>
		resolveCommandState(state, registries, commandId);
};
