import { createFrameObject } from "@jiscribe/canvas-sdk";

import { buildFolderFigure } from "./buildFolderFigure";
import type { FolderState } from "../../state/folder/FolderState";
import { Pictogram } from "../shared/Pictogram";

/** Folder presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Folder = createFrameObject<FolderState>((state, shape) => (
	<Pictogram
		figure={buildFolderFigure(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
		shape={shape}
	/>
));
