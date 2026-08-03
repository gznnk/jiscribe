import { NOTE_FOLD_RATIO } from "../../schema/note/NoteDoc";

/**
 * Side length of the folded corner. Taken from the shorter side, so the fold
 * stays a right isosceles triangle however the box is stretched — a fold taken
 * from the width alone would shear into a sliver on a short, wide box.
 *
 * @param width Box width; 0 collapses the fold to 0 rather than erroring.
 * @param height Box height.
 * @returns The fold's leg length in local px, never larger than either side.
 */
export const calcNoteFoldSize = (width: number, height: number): number =>
	Math.min(width, height) * NOTE_FOLD_RATIO;
