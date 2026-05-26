import type { TransformedFrame } from "@workspace/geometry";
import { calcNonZeroSign, nanToZero } from "@workspace/geometry";

import type { TransformState } from "../../../../../../states/objects/base/TransformState";

/** アスペクト比を維持した高さを計算する。 */
export function calcHeightWithAspectRatio(
	width: number,
	aspectRatio: number,
): number {
	return nanToZero(width / aspectRatio);
}

/** アスペクト比を維持した幅を計算する。 */
export function calcWidthWithAspectRatio(
	height: number,
	aspectRatio: number,
): number {
	return nanToZero(height * aspectRatio);
}

/** 寸法が最小値を下回る場合に調整する。 */
export function enforceResizeDimensions(
	startFrame: TransformedFrame & TransformState,
	newWidth: number,
	newHeight: number,
	aspectRatio: number | undefined,
	shouldKeepProportion: boolean | undefined,
): { width: number; height: number } {
	const minWidth = startFrame.minWidth ?? 0;
	const minHeight = startFrame.minHeight ?? 0;

	const absWidth = Math.abs(newWidth);
	const absHeight = Math.abs(newHeight);
	const widthSign = calcNonZeroSign(newWidth);
	const heightSign = calcNonZeroSign(newHeight);

	// Check if either dimension is below minimum
	const widthBelowMin = absWidth < minWidth;
	const heightBelowMin = absHeight < minHeight;

	if (!widthBelowMin && !heightBelowMin) {
		return { width: newWidth, height: newHeight };
	}

	if (!shouldKeepProportion || !aspectRatio) {
		return {
			width: widthBelowMin ? minWidth * widthSign : newWidth,
			height: heightBelowMin ? minHeight * heightSign : newHeight,
		};
	}

	const minWidthFromHeight = minHeight * aspectRatio;
	const minHeightFromWidth = minWidth / aspectRatio;

	let adjustedWidth: number;
	let adjustedHeight: number;

	if (minWidthFromHeight > minWidth) {
		adjustedHeight = minHeight * heightSign;
		adjustedWidth = minWidthFromHeight * widthSign;
	} else {
		adjustedWidth = minWidth * widthSign;
		adjustedHeight = minHeightFromWidth * heightSign;
	}

	return {
		width: adjustedWidth,
		height: adjustedHeight,
	};
}
