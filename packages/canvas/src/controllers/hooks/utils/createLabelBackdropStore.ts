import type {
	LabelBackdropLayer,
	LabelBackdropStore,
} from "../../../rendering/objects/LabelBackdropStoreContext";
import { NO_LABEL_BACKDROP_LAYERS } from "../../../rendering/objects/LabelBackdropStoreContext";

/** The backdrop store with the writes only the owning `<Canvas>` makes. */
export type WritableLabelBackdropStore = LabelBackdropStore & {
	/**
	 * Replaces every label's layers without notifying, so a write during render
	 * reaches the components rendered after it in that pass and no other. A
	 * label whose layers come out the same keeps its previous array.
	 *
	 * @param layersByOwnerId - The new layers by owner id (resolveLabelBackdrops); an id left out has none
	 * @returns Whether any label's layers changed, one that lost its entry included
	 */
	replaceLayers: (
		layersByOwnerId: ReadonlyMap<string, readonly LabelBackdropLayer[]>,
	) => boolean;
	/** Notifies every subscriber, each re-rendering only if its own layers changed. */
	notify: () => void;
};

const isSameLayer = (
	layer: LabelBackdropLayer,
	otherLayer: LabelBackdropLayer,
): boolean =>
	layer.fill === otherLayer.fill &&
	layer.fillOpacity === otherLayer.fillOpacity &&
	layer.rect.x === otherLayer.rect.x &&
	layer.rect.y === otherLayer.rect.y &&
	layer.rect.width === otherLayer.rect.width &&
	layer.rect.height === otherLayer.rect.height;

const isSameLayers = (
	layers: readonly LabelBackdropLayer[],
	otherLayers: readonly LabelBackdropLayer[],
): boolean =>
	layers.length === otherLayers.length &&
	layers.every((layer, index) => isSameLayer(layer, otherLayers[index]));

/**
 * Builds the store a `<Canvas>` hands its rendering layer through
 * `LabelBackdropStoreContext`. Every method is bound once here, so `subscribe`
 * keeps one identity, as `useSyncExternalStore` needs to avoid resubscribing.
 */
export const createLabelBackdropStore = (): WritableLabelBackdropStore => {
	const listeners = new Set<() => void>();
	let layersByOwnerId: ReadonlyMap<string, readonly LabelBackdropLayer[]> =
		new Map();

	return {
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getLayers: (ownerId) =>
			layersByOwnerId.get(ownerId) ?? NO_LABEL_BACKDROP_LAYERS,
		replaceLayers: (nextLayersByOwnerId) => {
			let hasChanged = nextLayersByOwnerId.size !== layersByOwnerId.size;
			const keptLayersByOwnerId = new Map<
				string,
				readonly LabelBackdropLayer[]
			>();
			for (const [ownerId, nextLayers] of nextLayersByOwnerId) {
				const previousLayers = layersByOwnerId.get(ownerId);
				if (
					previousLayers !== undefined &&
					isSameLayers(previousLayers, nextLayers)
				) {
					keptLayersByOwnerId.set(ownerId, previousLayers);
				} else {
					keptLayersByOwnerId.set(ownerId, nextLayers);
					hasChanged = true;
				}
			}
			layersByOwnerId = keptLayersByOwnerId;
			return hasChanged;
		},
		notify: () => {
			for (const listener of listeners) {
				listener();
			}
		},
	};
};
