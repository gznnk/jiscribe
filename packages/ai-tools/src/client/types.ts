// The contract the UI side (the panel, capturing, moving the view, measuring)
// has the host application inject. The way in and out of the document is not
// UI-only — a server may be the one holding the file — so it sits in
// ../apply/docBridge instead.

import type {
	Camera,
	CanvasInteractionStatus,
	CanvasPngExportOptions,
	ObjectOverlap,
	TextSlotMeasurement,
	Viewport,
} from "@jiscribe/canvas";
import type { Point, Rect } from "@jiscribe/geometry";

import type { AiFitTarget } from "../canvasOps";

/**
 * Burns the current canvas into a PNG. By default it is fitted to the whole
 * drawing and owes nothing to the pan and zoom on screen (pass `options.region`
 * to cut out the visible area or particular shapes instead). Returns null while
 * the canvas is not mounted.
 */
export type CapturePng = (
	options?: CanvasPngExportOptions,
) => Promise<Blob | null>;

/** The result of selectObjects: which of the ids asked for got through, and which were dropped */
export type AiSelectionResult = {
	/** The ids actually selected */
	selectedIds: readonly string[];
	/** The ids that could not be selected (not on the canvas, a connector named together with something else, and so on) */
	ignoredIds: readonly string[];
};

/** The result of getView: the camera itself and the visible region it decides, read in one go */
export type AiViewSnapshot = {
	/** The camera (top-left world coordinate and zoom) together with the measured on-screen size of the drawing area */
	viewport: Viewport;
	/** The world rect on screen right now; a shape placed inside it lands in front of the user */
	visibleWorldRect: Rect;
};

/**
 * The way in for the operations a document alone cannot answer, the ones that
 * need a mounted canvas. The host builds it from Canvas's imperative handle
 * (viewport / selection / measure / export / interaction) and passes it in. A
 * host with no canvas cannot inject it, which is why every AiHandleOp comes
 * through here.
 */
export type AiHandleControl = {
	/**
	 * Whether a canvas is on screen and can be worked on. While this is false the
	 * other methods are not called (with the view switched away there is nothing
	 * to act on at all)
	 */
	isAvailable: () => boolean;
	/**
	 * Replaces the selection; an empty array clears it.
	 * Returns the ids actually selected and the ones dropped (an id that does not
	 * exist is dropped)
	 */
	selectObjects: (ids: readonly string[]) => AiSelectionResult;
	/**
	 * Reads the ids selected right now.
	 *
	 * @returns The selected ids (the shapes, and the connector when one is
	 *   selected). Nothing selected gives an empty array, which is not a failure
	 *   but the answer "nothing is selected"
	 */
	getSelectedIds: () => readonly string[];
	/**
	 * Moves a world point to the centre of the screen.
	 *
	 * @param point - The world coordinate to put at the centre
	 * @param zoom - The zoom; omitted keeps the current one (a value outside the
	 *   range is clamped)
	 * @returns The camera after applying; null when there is nothing to move
	 */
	centerView: (point: { x: number; y: number }, zoom?: number) => Camera | null;
	/**
	 * Replaces the camera (the top-left world coordinate and the zoom) outright.
	 * The zoom is not clamped, so it is the caller (the tool's schema) that
	 * guarantees it is in a sensible range.
	 *
	 * @param camera - The camera to apply; the size of the screen stays as the
	 *   container measures it and does not change
	 * @returns The camera applied; null when there is nothing to move
	 */
	setView: (camera: Camera) => Camera | null;
	/**
	 * Reads the camera as it stands and the world region it shows, in one go.
	 *
	 * @returns The camera and the visible region; null when there is no canvas
	 */
	getView: () => AiViewSnapshot | null;
	/**
	 * Frames the view so that the whole drawing, or the selected objects, fits.
	 *
	 * @param target - What to frame
	 * @returns The camera after applying; null when there is nothing to frame (an
	 *   empty canvas, nothing selected), and the view does not move
	 */
	fitView: (target: AiFitTarget) => Camera | null;
	/**
	 * Frames the view so that the world rect given fits.
	 *
	 * @param rect - The region to fit; the proportions of the screen leave one
	 *   axis showing more than this (read what actually shows back with getView)
	 * @returns The camera after applying; null for a rect with no extent on either
	 *   axis (a point), and the view does not move
	 */
	fitViewToRect: (rect: Rect) => Camera | null;
	/**
	 * Measures what one text slot draws: the box it is drawn in, its size once
	 * wrapped, the number of lines, and whether it overflows.
	 *
	 * @param id - The id of the object holding the slot
	 * @param slotId - The slot to measure; omitted takes the first one (the one
	 *   editing opens)
	 * @returns The measurement; null when there is no such id, when the type has
	 *   no text region (connectors, the poly shapes), or when it holds no such
	 *   slot
	 */
	measureText: (id: string, slotId?: string) => TextSlotMeasurement | null;
	/**
	 * Returns the pairs of shapes that overlap, widest overlap first.
	 *
	 * @param ids - The shapes to compare; omitted takes every object on the
	 *   canvas. Ids that are not on the canvas, connectors and groups are dropped
	 *   silently
	 * @returns The overlapping pairs; an empty array when nothing overlaps (which
	 *   is not a failure)
	 */
	findOverlaps: (ids?: readonly string[]) => readonly ObjectOverlap[];
	/**
	 * Returns the route a connector is actually drawn along, from its source end
	 * to its target end.
	 *
	 * @param id - The id of the connector to trace
	 * @returns The vertices of the ends and the corners; null when there is no
	 *   such id, when it is not a connector, or when an end cannot be resolved
	 *   (what it hangs on is gone)
	 */
	measureConnectorPath: (id: string) => readonly Point[] | null;
	/**
	 * Returns what is actually drawn, decoration included, as one rect combining
	 * every id given.
	 *
	 * @param ids - What to measure; pass several and they are combined into a
	 *   single rect
	 * @returns The combined rect; null when not one of the ids draws anything
	 */
	measureVisualBounds: (ids: readonly string[]) => Rect | null;
	/**
	 * Returns the objects drawn at a world point or rect, front-most first.
	 *
	 * @param target - A point is tested against the real outlines, a rect against
	 *   the overlap of bounding boxes
	 * @param tolerance - How far from the line a line-like shape (a connector, a
	 *   polyline) still counts as hit, in world px; omitted takes the canvas
	 *   default
	 * @returns The ids from the front back; an empty array when there is nothing
	 *   (which is not a failure). Groups are never returned — their members are
	 *   tested one by one
	 */
	hitTest: (target: Point | Rect, tolerance?: number) => readonly string[];
	/**
	 * Turns the current canvas into an SVG string.
	 *
	 * @returns The SVG string; null while the canvas is not mounted
	 */
	toSvgString: () => string | null;
	/**
	 * Reads what the user is doing to the canvas at this moment: whether a drag is
	 * under way, which text is open for editing, whether a modal is open.
	 *
	 * @returns A snapshot of that instant; null when there is no canvas
	 */
	getInteractionStatus: () => CanvasInteractionStatus | null;
	/**
	 * Converts a client coordinate (the same space PointerEvent.clientX/Y is in)
	 * into a world coordinate.
	 *
	 * @param clientPoint - A point on screen, with the top-left of the window as
	 *   its origin
	 * @returns The point in world coordinates; null before the canvas has mounted
	 *   its `<svg>`
	 */
	toWorld: (clientPoint: Point) => Point | null;
	/**
	 * The other way round from {@link toWorld}. The answer changes with every pan
	 * and zoom.
	 *
	 * @param worldPoint - A point in world coordinates
	 * @returns The point in client coordinates; null before the canvas has mounted
	 *   its `<svg>`
	 */
	toClient: (worldPoint: Point) => Point | null;
};
