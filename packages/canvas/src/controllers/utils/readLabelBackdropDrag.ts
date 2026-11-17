import type { LabelBackdropDrag } from "./resolveLabelBackdrops";
import type { MovePreview } from "../../rendering/layers/content/MovePreview";
import type { CanvasDragDetail } from "../CanvasTypes";

/**
 * The drag as the label backdrops take it (useLabelBackdropStore's `drag`): an
 * inert one counts as none.
 *
 * @param drag - The drag in progress, of which only the kind is read; null when
 *   no pointer drag is under way
 * @param movePreview - Handed on as given; the caller passes one for a move
 *   drag alone
 * @returns null for no drag and for an inert one
 */
export const readLabelBackdropDrag = (
	drag: Pick<CanvasDragDetail, "kind"> | null,
	movePreview: MovePreview | undefined,
	visibleIds: ReadonlySet<string>,
): LabelBackdropDrag | null =>
	drag === null || drag.kind === "inert" ? null : { movePreview, visibleIds };
