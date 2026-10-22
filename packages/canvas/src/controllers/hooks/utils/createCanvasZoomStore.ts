import type { CanvasZoomStore } from "../../../rendering/objects/CanvasZoomStoreContext";

/** The zoom store with the writes only the owning `<Canvas>` makes. */
export type WritableCanvasZoomStore = CanvasZoomStore & {
	/** Sets the drawn zoom; notifies only when it differs from the current one. */
	setZoom: (zoom: number) => void;
	/** Raises or lowers the snapshot flag; notifies only when it flips. */
	setSnapshotRendering: (isSnapshotRendering: boolean) => void;
};

/**
 * Builds the store a `<Canvas>` hands its rendering layer through
 * `CanvasZoomStoreContext`. Every method is bound once here, so `subscribe`
 * keeps one identity, as `useSyncExternalStore` needs to avoid resubscribing.
 *
 * @param initialZoom - The zoom the first render is drawn at
 */
export const createCanvasZoomStore = (
	initialZoom: number,
): WritableCanvasZoomStore => {
	const listeners = new Set<() => void>();
	let zoom = initialZoom;
	let isSnapshotRendering = false;

	const notify = (): void => {
		for (const listener of listeners) {
			listener();
		}
	};

	return {
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getZoom: () => zoom,
		isSnapshotRendering: () => isSnapshotRendering,
		setZoom: (nextZoom) => {
			if (nextZoom === zoom) {
				return;
			}
			zoom = nextZoom;
			notify();
		},
		setSnapshotRendering: (nextIsSnapshotRendering) => {
			if (nextIsSnapshotRendering === isSnapshotRendering) {
				return;
			}
			isSnapshotRendering = nextIsSnapshotRendering;
			notify();
		},
	};
};
