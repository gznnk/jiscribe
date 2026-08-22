import { FILE_FOLD_HEIGHT_RATIO, FILE_FOLD_WIDTH_RATIO } from "./FileDoc";

/**
 * Side length of the folded corner. The smaller of the two ratios wins, so the
 * fold stays a right isosceles triangle however the box is stretched — a fold
 * taken from the width alone would shear into a sliver on a short, wide box.
 *
 * @param width Box width; 0 collapses the fold to 0 rather than erroring.
 * @param height Box height.
 * @returns The fold's leg length in local px, never larger than either side.
 */
export const calcFileFoldSize = (width: number, height: number): number =>
	Math.min(width * FILE_FOLD_WIDTH_RATIO, height * FILE_FOLD_HEIGHT_RATIO);
