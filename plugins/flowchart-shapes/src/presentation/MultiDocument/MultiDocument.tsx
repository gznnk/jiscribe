import { createFrameObject } from "@workspace/canvas-sdk";

import { calcMultiDocumentSheets } from "./calcMultiDocumentSheets";
import { MultiDocumentElement } from "./MultiDocumentStyled";
import type { MultiDocumentState } from "../../state/multiDocument/MultiDocumentState";
import { buildDocumentPath } from "../Document/buildDocumentPath";

/**
 * Renders a multi-document as three stacked document sheets (Frame-family
 * shared logic lives in createFrameObject; only the shape is swapped in).
 * Sheets are drawn back → front so an opaque fill hides the covered edges.
 */
export const MultiDocument = createFrameObject<MultiDocumentState>(
	(state, shape) => {
		const sheets = calcMultiDocumentSheets(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		);
		return (
			<g data-kind="object" data-id={state.id} style={{ cursor: "grab" }}>
				{sheets.map((sheet, index) => (
					<MultiDocumentElement
						key={index}
						d={buildDocumentPath(sheet.x, sheet.y, sheet.width, sheet.height)}
						transform={shape.transform}
						strokeColor={shape.strokeColor}
						fillColor={shape.fillColor}
						strokeWidth={shape.strokeWidth}
						strokeDasharray={shape.strokeDasharray}
					/>
				))}
			</g>
		);
	},
);
