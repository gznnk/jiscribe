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
 * @param ownerId - The id of the object owning the label; undefined for a
 *   caller that names none, which gets no layers
 * @returns The layers bottom first; empty outside a `<Canvas>`, without an
 *   `ownerId`, and for a label on no backdrop
 */
export const useLabelBackdropLayers = (
	ownerId: string | undefined,
): readonly LabelBackdropLayer[] => {
	const store = useLabelBackdropStoreContext();
	return useSyncExternalStore(store?.subscribe ?? subscribeToNothing, () =>
		store === null || ownerId === undefined
			? NO_LABEL_BACKDROP_LAYERS
			: store.getLayers(ownerId),
	);
};
