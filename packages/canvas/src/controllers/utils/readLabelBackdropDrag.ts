import type { LabelBackdropDrag } from "./resolveLabelBackdrops";
import type { MovePreview } from "../../rendering/layers/content/MovePreview";
import type { CanvasDragDetail } from "../CanvasTypes";

/**
 * What the label backdrops read of the drag in progress (useLabelBackdropStore):
 * mid-drag, a connector the drawing does not route is not routed for its label
 * either (resolveLabelBackdrops).
 *
 * An inert drag — not yet claimed by a handler, or a marquee dropped by Escape —
 * moves nothing, so it counts as no drag: a pass that took a center from the
 * drag is worked out exactly there rather than at the pointer's release.
 *
 * @param drag - The drag in progress, of which only the kind is read; null when
 *   no pointer drag is under way
 * @param movePreview - What a move drag translated this frame; undefined for
 *   any other drag
 * @param visibleIds - The ids drawn this frame (viewport culling)
 * @returns null for no drag and for an inert one; otherwise the preview and the
 *   visible ids as given
 */
export const readLabelBackdropDrag = (
	drag: Pick<CanvasDragDetail, "kind"> | null,
	movePreview: MovePreview | undefined,
	visibleIds: ReadonlySet<string>,
): LabelBackdropDrag | null =>
	drag === null || drag.kind === "inert" ? null : { movePreview, visibleIds };
