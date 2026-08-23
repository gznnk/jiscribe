import { useEffect, useRef } from "react";

import {
	type Camera,
	isSameCamera,
	type Viewport,
} from "../../states/canvas/Viewport";

/**
 * Notifies the host when the camera (pan/zoom) changes.
 *
 * The full `Viewport` is watched, but only the camera fields (minX, minY, zoom)
 * are compared and delivered: width/height come from the container's
 * ResizeObserver (CONTAINER_RESIZE), and firing on a pure resize would be
 * spurious for a host that only wants to track/restore the view.
 *
 * Comparison is by value (not reference): the reducer can produce a new
 * `viewport` instance with the same camera across unrelated dispatches, so a
 * value check avoids firing when the camera did not actually move. The callback
 * goes through a ref so a host passing a new function each render cannot re-fire
 * the effect.
 *
 * Read-only by contract: the host must not feed the reported camera back in to
 * drive the view (there is no controlled `viewport` prop). Program the view via
 * `ref.current.viewport.setViewport`; mirroring back would fight continuous gestures.
 *
 * The mount render establishes the baseline (the doc-derived initial camera)
 * and does not notify; the host assumes the initial view until the first change.
 * A document's `view.open` is not part of that baseline: it needs the container
 * measured, so useInitialViewOpen applies it in a commit of its own (still before
 * the first paint), and the host is told about that framing as a change.
 *
 * @param viewport - The current viewport (only its camera is observed)
 * @param onViewportChange - Callback invoked with the new camera on change
 */
export const useNotifyViewportChange = (
	viewport: Viewport,
	onViewportChange?: (viewport: Camera) => void,
): void => {
	const onViewportChangeRef = useRef(onViewportChange);
	useEffect(() => {
		onViewportChangeRef.current = onViewportChange;
	});

	// null marks "before the first render"; the mount render only records the
	// baseline so the initial camera is not delivered as a change.
	const prevCameraRef = useRef<Camera | null>(null);
	useEffect(() => {
		const camera: Camera = {
			minX: viewport.minX,
			minY: viewport.minY,
			zoom: viewport.zoom,
		};
		const prevCamera = prevCameraRef.current;
		if (prevCamera !== null && isSameCamera(prevCamera, camera)) {
			return;
		}
		const isMountBaseline = prevCamera === null;
		prevCameraRef.current = camera;
		if (isMountBaseline) {
			return;
		}
		onViewportChangeRef.current?.(camera);
	}, [viewport.minX, viewport.minY, viewport.zoom]);
};
