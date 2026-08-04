import { createFrameObject } from "@workspace/canvas-sdk";

import { buildNoteFigure } from "./buildNoteFigure";
import { NoteBodyPath, NoteFoldPath } from "./NoteStyled";
import type { NoteState } from "../../state/note/NoteState";

/**
 * Renders a note (Frame-family shared logic lives in createFrameObject). It draws
 * a group rather than the single path the default renderer would, because the
 * fold has to be stroked without fill while the silhouette carries both; the
 * group is the one `data-kind="object"` element the DOM contract requires, so
 * neither path carries it.
 */
export const Note = createFrameObject<NoteState>((state, shape) => {
	const figure = buildNoteFigure(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
	);
	return (
		<g
			data-kind={shape["data-kind"]}
			data-id={shape["data-id"]}
			transform={shape.transform}
		>
			<NoteBodyPath
				d={figure.body}
				strokeColor={shape.strokeColor}
				fillColor={shape.fillColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
			<NoteFoldPath
				d={figure.fold}
				strokeColor={shape.strokeColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		</g>
	);
});
