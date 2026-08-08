import { calcSelectionFitViewport } from "../../utils/calcSelectionFitViewport";
import type { ExecutableCommand } from "../CommandTypes";

const PADDING_PX = 48;

export const ZoomToSelectionCommand: ExecutableCommand = {
	id: "zoomToSelection",
	label: "Zoom to Selection",
	category: "view",
	shortcuts: {
		mac: [{ code: "Digit2", meta: true }],
		win: [{ code: "Digit2", ctrl: true }],
		default: [{ code: "Digit2", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state, registries) => {
		const fitted = calcSelectionFitViewport(
			state.selectedIds,
			state.objects,
			{
				width: state.viewport.width,
				height: state.viewport.height,
				padding: PADDING_PX,
			},
			registries.objectVisualBounds,
		);
		// For degenerate targets with no extent to fit (both axes size 0, e.g. a
		// single-point Poly or a degenerate Frame), keep the current viewport
		// (consistent with the "no targets" no-op guard).
		if (!fitted) {
			return state;
		}
		return { ...state, viewport: fitted };
	},
};
