import { createFrameObject } from "@workspace/canvas-sdk";

import { buildBrowserWindowFigure } from "./buildBrowserWindowFigure";
import type { BrowserWindowState } from "../../state/browserWindow/BrowserWindowState";
import { Pictogram } from "../shared/Pictogram";

/** BrowserWindow presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const BrowserWindow = createFrameObject<BrowserWindowState>(
	(state, shape) => (
		<Pictogram
			figure={buildBrowserWindowFigure(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
			shape={shape}
		/>
	),
);
