import { calcFitViewport } from "../../utils/calcFitViewport";
import type { ExecutableCommand } from "../CommandTypes";

const PADDING_PX = 48;

export const ZoomToFitCommand: ExecutableCommand = {
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
		// For degenerate targets (no extent to fit to), keep the current viewport
		// (consistent with the "no targets" no-op guard).
		if (!fitted) {
			return state;
		}
		return { ...state, viewport: fitted };
	},
};
