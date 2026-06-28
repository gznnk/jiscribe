import { calcFitViewport } from "../../utils/calcFitViewport";
import type { Command } from "../CommandTypes";

const PADDING_PX = 48;

export const ZoomToFitCommand: Command = {
	id: "zoomToFit",
	label: "Zoom to Fit",
	category: "view",
	shortcuts: {
		mac: [{ code: "Digit0", meta: true }],
		win: [{ code: "Digit0", ctrl: true }],
		default: [{ code: "Digit0", ctrl: true }],
	},

	canExecute: (state) => Object.keys(state.objects).length > 0,

	execute: (state) => {
		const fitted = calcFitViewport(state.objects, {
			width: state.viewport.width,
			height: state.viewport.height,
			padding: PADDING_PX,
		});
		// 退化対象（フィットできる広がりが無い）は現在のビューポートを維持する
		// （「対象なし」の no-op ガードと整合）。
		if (!fitted) {
			return state;
		}
		return { ...state, viewport: fitted };
	},
};
