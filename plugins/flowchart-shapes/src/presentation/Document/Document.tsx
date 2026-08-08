import { ShapeBodyPath, createFrameObject } from "@workspace/canvas-sdk";

import { buildDocumentPath } from "./buildDocumentPath";
import type { DocumentState } from "../../state/document/DocumentState";

/** Document presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Document = createFrameObject<DocumentState>((state, shape) => (
	<ShapeBodyPath
		{...shape}
		d={buildDocumentPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
