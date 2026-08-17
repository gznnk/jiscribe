import { convertBoundingBoxToRect } from "@jiscribe/geometry";
import type { Point, Rect } from "@jiscribe/geometry";
import { useMemo } from "react";

import { useCanvasStateMirror } from "./useCanvasStateMirror";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";
import { getFirstTextSlotId } from "../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasRegistries } from "../registries/CanvasRegistries";
import { collectConnectorPoints } from "../utils/calcConnectorBoundingBox";
import { calcObjectsBoundingBox } from "../utils/calcObjectBoundingBox";
import {
	findObjectOverlaps,
	type ObjectOverlap,
} from "../utils/findObjectOverlaps";
import { hitTestObjects } from "../utils/hitTestObjects";
import {
	measureTextSlot,
	type TextSlotMeasurement,
} from "../utils/measureTextSlot";

/** Per-call options of {@link CanvasMeasureHandle.hitTest}. */
export type CanvasHitTestOptions = {
	/**
	 * How far (world px) beyond its stroke a line-like shape — a connector, a
	 * polyline — still counts as hit. Defaults to 4; area-bearing shapes ignore
	 * it, being hit inside their outline and nowhere else.
	 */
	tolerance?: number;
};

/**
 * Imperative measurement API exposed on the `measure` namespace of the Canvas
 * handle (`ref.current.measure`). Answers what the document alone cannot: how a
 * shape is actually laid out and drawn.
 *
 * The split against the headless document ops is the point of the namespace. A
 * document holds what was asked for — a text, a size, two endpoints — while the
 * canvas holds what came of it: how many lines that text wrapped to and whether
 * they still fit, how far outside its box a shape draws, which way a connector
 * was routed around the shapes in between. A generator (a host laying a diagram
 * out, an agent drawing one) needs the second kind to check its own work, and
 * every method here is a read: none of them touches the document.
 *
 * Everything is measured from the committed state rather than from the DOM, so
 * an object the current view has scrolled past (and viewport culling has
 * dropped) measures the same as one on screen.
 */
export type CanvasMeasureHandle = {
	/**
	 * Bounds of what the objects *draw*, decoration outside their geometry
	 * included (an actor's label, a sticky's shadow) — the extent zoom-to-fit
	 * and the export viewBox use. `docOps.getObjectsBounds` is the geometry-box
	 * counterpart, which is what a layout should be computed from.
	 *
	 * @param ids - Objects to include; missing ids and objects with no extent
	 *   (an unresolvable connector, an empty group) are skipped
	 * @returns The union in world coordinates, or null when no id had an extent
	 */
	visualBounds(ids: readonly string[]): Rect | null;
	/**
	 * How one text slot came out: the box it is drawn in, the size the wrapped
	 * text takes, and whether the shape is clipping it
	 * (see {@link TextSlotMeasurement}).
	 *
	 * @param id - The object holding the slot
	 * @param slotId - Which slot; omitted measures the shape's first slot, the
	 *   one editing opens by default. An unknown slot yields null
	 * @returns The measurement, or null for a missing object, a shape with no
	 *   text region (a connector, a poly shape), or an absent slot
	 */
	textBounds(id: string, slotId?: string): TextSlotMeasurement | null;
	/**
	 * The line a connector is actually drawn along: its endpoints as they landed
	 * on the two silhouettes, with every bend the router chose in between. The
	 * document stores neither — an endpoint is an anchor reference and an
	 * orthogonal route is computed at draw time.
	 *
	 * @param id - The connector to trace
	 * @returns The path, source end first, or null for a missing object, one
	 *   that is not a connector, or endpoints that cannot be resolved (an owner
	 *   shape was deleted)
	 */
	connectorPath(id: string): Point[] | null;
	/**
	 * The shapes sitting on top of one another (see {@link ObjectOverlap}) — the
	 * check a computed layout is verified with.
	 *
	 * @param ids - Shapes to compare, or every object on the canvas when omitted
	 * @returns One entry per overlapping pair, largest shared area first
	 */
	overlaps(ids?: readonly string[]): ObjectOverlap[];
	/**
	 * The objects drawn at a world point, front-most first — how a coordinate
	 * read off an exported image is turned back into the objects it names.
	 *
	 * @param target - A world point, or a world rect to collect everything
	 *   reaching into it (matched against bounding boxes rather than silhouettes)
	 * @param options - Hit slack for line-like shapes
	 *   (see {@link CanvasHitTestOptions})
	 * @returns Ids front-most first, so `result[0]` is what a click there would
	 *   land on. Groups are never included; their members are tested one by one
	 */
	hitTest(target: Point | Rect, options?: CanvasHitTestOptions): string[];
};

/**
 * Builds the stable measurement sub-handle assembled into the Canvas handle.
 *
 * @param canvasState - Current controller state, read at call time (not at
 *   render time) so the handle stays referentially stable
 * @param registries - The canvas's registry bundle, supplying the per-type
 *   silhouettes, text regions and style defaults every measurement resolves
 *   through; a plugin type is measured like a built-in one because of it
 */
export const useMeasureHandle = (
	canvasState: CanvasControllerState,
	registries: CanvasRegistries,
): CanvasMeasureHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

	return useMemo(
		() => ({
			visualBounds: (ids) => {
				const bounds = calcObjectsBoundingBox(
					ids,
					canvasStateRef.current.objects,
					registries.objectVisualBounds,
				);
				return bounds ? convertBoundingBoxToRect(bounds) : null;
			},

			textBounds: (id, slotId) => {
				const { objects, docDefaults } = canvasStateRef.current;
				const object = objects[id];
				if (!object) {
					return null;
				}
				const resolvedSlotId =
					slotId ??
					getFirstTextSlotId(
						isTextStyleState(object) ? object.text : undefined,
					);
				if (resolvedSlotId === undefined) {
					return null;
				}
				return measureTextSlot(
					object,
					resolvedSlotId,
					registries,
					docDefaults.fontFamily,
				);
			},

			connectorPath: (id) => {
				const { objects } = canvasStateRef.current;
				const object = objects[id];
				if (!object || !isConnectorState(object)) {
					return null;
				}
				return collectConnectorPoints(
					object,
					objects,
					registries.objectOutline,
					registries.objectAnchorRegion,
					registries.objectExtraConnectPoints,
				);
			},

			overlaps: (ids) =>
				findObjectOverlaps(ids, canvasStateRef.current.objects),

			hitTest: (target, options) => {
				const { objects, rootIds } = canvasStateRef.current;
				return hitTestObjects(
					target,
					objects,
					rootIds,
					registries,
					options?.tolerance,
				);
			},
		}),
		[canvasStateRef, registries],
	);
};
