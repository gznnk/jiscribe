import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildTerminalWindowFigure } from "./buildTerminalWindowFigure";
import type { TerminalWindowState } from "../../state/terminalWindow/TerminalWindowState";
import { Pictogram } from "../shared/Pictogram";

/** TerminalWindow presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const TerminalWindow = createFrameObject<TerminalWindowState>(
	(state, shape) => (
		<Pictogram
			figure={buildTerminalWindowFigure(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
			shape={shape}
		/>
	),
);
