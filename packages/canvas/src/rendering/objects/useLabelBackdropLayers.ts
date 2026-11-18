import { useSyncExternalStore } from "react";

import type { LabelBackdropLayer } from "./LabelBackdropStoreContext";
import {
	NO_LABEL_BACKDROP_LAYERS,
	useLabelBackdropStoreContext,
} from "./LabelBackdropStoreContext";

/** Subscription for a tree with no canvas around it, where nothing ever changes. */
const subscribeToNothing = (): (() => void) => () => {};

/**
 * The backdrop layers the surrounding `<Canvas>` worked out for one label
 * (LabelBackdropStore), to be painted over the page's color behind it.
 *
 * Subscribes to that label's layers alone, so working the backdrops out again
 * re-renders only the labels whose layers changed.
 *
 * @param ownerId - The id of the object owning the label. Which labels have
 *   layers is the store's to decide (resolveLabelBackdrops): one with a
 *   background of its own has none, so a caller asks whatever its fill
 * @returns The layers bottom first; empty outside a `<Canvas>` and for a label
 *   on no backdrop
 */
export const useLabelBackdropLayers = (
	ownerId: string,
): readonly LabelBackdropLayer[] => {
	const store = useLabelBackdropStoreContext();
	return useSyncExternalStore(store?.subscribe ?? subscribeToNothing, () =>
		store === null ? NO_LABEL_BACKDROP_LAYERS : store.getLayers(ownerId),
	);
};
