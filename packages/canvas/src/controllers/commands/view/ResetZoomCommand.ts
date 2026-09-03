import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";

import type { ExecutableCommand } from "../CommandTypes";

/** Target zoom factor to reset to (100%). */
const RESET_ZOOM = 1;

/**
 * Command that resets the zoom back to 100%.
 * Keeps the viewport center fixed and only sets the factor to 1.
 * Triggered by clicking the zoom value display in the toolbar.
 */
export const ResetZoomCommand: ExecutableCommand = {
	id: "resetZoom",
	label: "Reset Zoom",
	category: "view",

	// Allowed to trigger even when already at 100% (just a center-preserving no-op).
	// Always executable so it never appears disabled.
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
