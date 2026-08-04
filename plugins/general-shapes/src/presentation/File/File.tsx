import { createFrameObject } from "@workspace/canvas-sdk";

import { buildFileFigure } from "./buildFileFigure";
import type { FileState } from "../../state/file/FileState";
import { Pictogram } from "../shared/Pictogram";

/** File presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const File = createFrameObject<FileState>((state, shape) => (
	<Pictogram
		figure={buildFileFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
	/>
));
