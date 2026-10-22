import { createContext, useContext } from "react";

/**
 * The read side of what the surrounding `<Canvas>` knows about how it is drawn:
 * the zoom, and whether a DOM snapshot (export) is cloning the live SVG right
 * now. It knows nothing about what a reader does with either.
 *
 * A store rather than the number itself, so that a zoom step does not re-render
 * every consumer: each one subscribes to whatever it derives from these (a
 * boolean, say) and is re-rendered only when that changes.
 */
export type CanvasZoomStore = {
	/**
	 * Registers `listener` to be called after either value changes; shaped for
	 * `useSyncExternalStore`, and the same function on every read.
	 *
	 * @param listener - Called with no arguments once per change, synchronously
	 *   from the write, so a write inside `flushSync` re-renders in that commit
	 * @returns Unregisters `listener`; calling it twice is harmless
	 */
	subscribe: (listener: () => void) => () => void;
	/** The zoom the canvas is drawn at: screen CSS px per world unit. */
	getZoom: () => number;
	/** True while a snapshot clones the live SVG, when every object must draw in full. */
	isSnapshotRendering: () => boolean;
};

/**
 * Rendering-layer context carrying the surrounding `<Canvas>`'s zoom store.
 *
 * The default null means no canvas is around (tests, a preview drawn outside
 * `<Canvas>`); a reader treats that as being drawn at full size.
 */
export const CanvasZoomStoreContext = createContext<CanvasZoomStore | null>(
	null,
);

/**
 * Reads the surrounding `<Canvas>`'s zoom store. The store's identity is fixed
 * for the canvas's lifetime, so reading it never re-renders on a zoom change.
 *
 * @returns The store, or null outside a `<Canvas>`
 */
export function useCanvasZoomStoreContext(): CanvasZoomStore | null {
	return useContext(CanvasZoomStoreContext);
}
