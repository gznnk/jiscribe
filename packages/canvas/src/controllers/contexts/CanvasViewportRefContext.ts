import { createContext, type RefObject, useContext } from "react";

/**
 * Context that distributes the canvas root element (Viewport) ref to
 * descendant components.
 *
 * Popup UIs (context menus, submenus, etc.) use it to detect overflow beyond
 * the canvas area. The value is a ref object (stable reference), so no
 * re-render is triggered through the Provider.
 *
 * Canvas.tsx provides the canvasRef.
 */
export const CanvasViewportRefContext =
	createContext<RefObject<HTMLDivElement | null> | null>(null);

/**
 * Retrieves the canvas root element (Viewport) ref.
 *
 * Returns null outside a Provider, so callers must provide a fallback such as
 * the browser window bounds.
 */
export function useCanvasViewportRef(): RefObject<HTMLDivElement | null> | null {
	return useContext(CanvasViewportRefContext);
}
