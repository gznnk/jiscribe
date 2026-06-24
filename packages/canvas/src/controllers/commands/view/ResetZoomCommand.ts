import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../constants/precision";
import type { Command } from "../CommandTypes";

/** リセット先のズーム倍率（100%） */
const RESET_ZOOM = 1;

/**
 * ズームを 100% に戻すコマンド。
 * ビューポートの中心は保ったまま倍率だけを 1 に揃える。
 * ツールバーのズーム値表示クリックから実行される。
 */
export const ResetZoomCommand: Command = {
	id: "resetZoom",
	label: "Reset Zoom",
	category: "view",

	// 既に 100% でも押下できてよい（中心保持の no-op になるだけ）。
	// 見た目上の非活性状態を作らないため、常に実行可能とする。
	canExecute: () => true,

	execute: (state) => {
		const { viewport } = state;

		const centerX = viewport.minX + viewport.width / (2 * viewport.zoom);
		const centerY = viewport.minY + viewport.height / (2 * viewport.zoom);
		const newMinX = centerX - viewport.width / (2 * RESET_ZOOM);
		const newMinY = centerY - viewport.height / (2 * RESET_ZOOM);

		return {
			...state,
			viewport: {
				...viewport,
				zoom: RESET_ZOOM,
				minX: roundToDecimal(newMinX, PRECISION.COORDINATE),
				minY: roundToDecimal(newMinY, PRECISION.COORDINATE),
			},
		};
	},
};
