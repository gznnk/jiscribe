import { buildDocumentPath } from "./buildDocumentPath";
import { DocumentElement } from "./DocumentStyled";
import type { DocumentState } from "../../../../states/objects/flowchart/document/DocumentState";
import { createFrameObject } from "../../base/createFrameObject";

/** Document presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Document = createFrameObject<DocumentState>((state, shape) => (
	<DocumentElement
		{...shape}
		d={buildDocumentPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
