import { createContext, useContext } from "react";

import { defaultCanvasMessages, type CanvasMessages } from "./CanvasMessages";

/**
 * Context that distributes the merged UI messages to descendant components.
 *
 * Canvas.tsx provides `resolveCanvasMessages(props.locale, props.messages)`. The
 * default value is the English defaults, so components render correctly outside
 * a Provider (e.g. in unit tests).
 */
export const CanvasMessagesContext = createContext<CanvasMessages>(
	defaultCanvasMessages,
);

/** Retrieves the current UI messages. */
export function useCanvasMessages(): CanvasMessages {
	return useContext(CanvasMessagesContext);
}
