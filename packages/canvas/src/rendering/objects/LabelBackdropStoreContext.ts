import type { Rect } from "@jiscribe/geometry";
import { createContext, useContext } from "react";

/**
 * One backdrop region painted under an `"auto"` label: the part of a frame's
 * fill that lies under the label's box (resolveLabelBackdrops).
 */
export type LabelBackdropLayer = {
	/** The painted part, with the label box's top-left corner as the origin, in the units the box is drawn in. */
	rect: Rect;
	/** The frame's resolved color: a CSS color or a `var(--jiscribe-…)` theme token. */
	fill: string;
	/** The frame's fill opacity, 0 to 1. */
	fillOpacity: number;
};

/** The layers of a label lying on no backdrop: one frozen array, so a snapshot of it never changes. */
export const NO_LABEL_BACKDROP_LAYERS: readonly LabelBackdropLayer[] =
	Object.freeze([]);

/**
 * The read side of the backdrops the surrounding `<Canvas>` worked out for its
 * labels, keyed by the id of the object owning the label (the captioned
 * shape, or the connector).
 *
 * A store rather than the map itself, so that working them out again does not
 * re-render every label: each one subscribes to its own layers and is
 * re-rendered only when those change.
 */
export type LabelBackdropStore = {
	/**
	 * Registers `listener` to be called after the layers of any label change;
	 * shaped for `useSyncExternalStore`, and the same function on every read.
	 *
	 * @param listener - Called with no arguments once per change
	 * @returns Unregisters `listener`; calling it twice is harmless
	 */
	subscribe: (listener: () => void) => () => void;
	/**
	 * The layers painted under one label, bottom first.
	 *
	 * @param ownerId - The id of the object owning the label
	 * @returns The same array for as long as its contents stand;
	 *   NO_LABEL_BACKDROP_LAYERS for a label lying on no backdrop, which is
	 *   painted on the page's color alone
	 */
	getLayers: (ownerId: string) => readonly LabelBackdropLayer[];
};

/**
 * Rendering-layer context carrying the surrounding `<Canvas>`'s backdrop store.
 *
 * The default null means no canvas is around (tests, a preview drawn outside
 * `<Canvas>`); a reader treats that as every label lying on the page alone.
 */
export const LabelBackdropStoreContext =
	createContext<LabelBackdropStore | null>(null);

/**
 * Reads the surrounding `<Canvas>`'s backdrop store. Its identity is fixed for
 * the canvas's lifetime, so reading it never re-renders on a change of layers.
 *
 * @returns The store, or null outside a `<Canvas>`
 */
export function useLabelBackdropStoreContext(): LabelBackdropStore | null {
	return useContext(LabelBackdropStoreContext);
}
