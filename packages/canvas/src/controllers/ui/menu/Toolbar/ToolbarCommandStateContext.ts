import { createContext, useContext } from "react";

import type { ResolvedCommandState } from "../../../hooks/useCommandState";

/** Looks up one command's current state; null when the id is not registered. */
export type ToolbarCommandStateResolver = (
	commandId: string,
) => ResolvedCommandState | null;

/**
 * Context that hands the toolbar's leaf buttons a resolver for command
 * availability, so each one subscribes on its own instead of the bar being
 * handed every state as a prop.
 *
 * Canvas.tsx provides a resolver bound to the current controller state. It
 * cannot ride in `CanvasProviders` (a bundle of values that stay put) because
 * this one changes on nearly every dispatch.
 *
 * There is no default: a resolver that answered without the state would report
 * availability that is not the canvas's, and the wrong disabled look is a
 * silent failure. {@link useToolbarCommandState} throws instead.
 */
export const ToolbarCommandStateContext =
	createContext<ToolbarCommandStateResolver | null>(null);

/**
 * Retrieves the resolver for command availability on the toolbar.
 *
 * @throws When rendered outside a `ToolbarCommandStateContext` provider.
 */
export function useToolbarCommandState(): ToolbarCommandStateResolver {
	const resolveCommand = useContext(ToolbarCommandStateContext);
	if (!resolveCommand) {
		throw new Error(
			"useToolbarCommandState: no ToolbarCommandStateContext provider above this component; the toolbar's command buttons must be rendered inside one",
		);
	}
	return resolveCommand;
}
