import type { CanvasExportHandle } from "./useExportHandle";
import type { CanvasHistoryHandle } from "./useHistoryHandle";
import type { CanvasInteractionHandle } from "./useInteractionHandle";
import type { CanvasMeasureHandle } from "./useMeasureHandle";
import type { CanvasSelectionHandle } from "./useSelectionHandle";
import type { CanvasViewportHandle } from "./useViewportHandle";

/**
 * Imperative Canvas API delivered through the component `ref`. Each subsystem
 * owns a namespace; new imperative capabilities are added as new namespaces
 * rather than new props.
 *
 * The namespaces split by what only a mounted canvas can answer. Editing the
 * document needs no canvas at all and belongs to the headless `docOps`; what
 * lives here is the camera, the selection, the rendered image, the measurements
 * that only exist once something has been drawn, the undo stack, and what the
 * user is doing to it right now.
 *
 * Every namespace is built once and kept for the canvas's lifetime, reading the
 * live state at call time (see useCanvasStateMirror), so a host can hold on to
 * `ref.current.viewport` and keep calling it.
 */
export type CanvasHandle = {
	/** Pan/zoom control and world/screen conversion (see {@link CanvasViewportHandle}). */
	viewport: CanvasViewportHandle;
	/** Selection control (see {@link CanvasSelectionHandle}). */
	selection: CanvasSelectionHandle;
	/** Image export (see {@link CanvasExportHandle}). */
	export: CanvasExportHandle;
	/** Measurement of what was actually drawn (see {@link CanvasMeasureHandle}). */
	measure: CanvasMeasureHandle;
	/** Undo stack control, batch rollback included (see {@link CanvasHistoryHandle}). */
	history: CanvasHistoryHandle;
	/** What the user is doing to the canvas (see {@link CanvasInteractionHandle}). */
	interaction: CanvasInteractionHandle;
};
