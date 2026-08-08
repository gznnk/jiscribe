import type { FrameShapeProps } from "@workspace/canvas-sdk";
import { ShapeBodyPath, createFrameObject } from "@workspace/canvas-sdk";
import type { Rect } from "@workspace/geometry";

import { buildOutsideSheetClipPath } from "./buildOutsideSheetClipPath";
import { calcMultiDocumentSheets } from "./calcMultiDocumentSheets";
import type { MultiDocumentState } from "../../state/multiDocument/MultiDocumentState";
import { buildDocumentPath } from "../Document/buildDocumentPath";

/**
 * SVG ids are document-global, so a per-object clip carries both the type name
 * and the object id (see `ObjectTypeDefinition.svgDefs`). Ids come from the
 * document and may hold anything, so everything a url(#…) reference cannot take
 * is folded to `_`.
 */
const buildClipId = (objectId: string, covering: string): string =>
	`multiDocument-${objectId.replace(/[^\w-]/g, "_")}-outside-${covering}`;

/** One document sheet of the stack, painted with the shape's own stroke and fill. */
const Sheet: React.FC<{ d: string; shape: FrameShapeProps }> = ({
	d,
	shape,
}) => (
	<ShapeBodyPath
		d={d}
		strokeColor={shape.strokeColor}
		fillColor={shape.fillColor}
		strokeWidth={shape.strokeWidth}
		strokeDasharray={shape.strokeDasharray}
	/>
);

/**
 * Renders a multi-document as three stacked document sheets, each clipped to
 * the area outside the sheets in front of it (Frame-family shared logic lives
 * in createFrameObject; only the shape is swapped in). Every sheet keeps its
 * own outline, minus the stretches a sheet in front covers — so a transparent
 * or semi-transparent fill shows what is really visible instead of all three
 * outlines through one another.
 *
 * The transform sits on the wrapping group so the clip geometry and the sheet
 * paths share one coordinate system.
 */
export const MultiDocument = createFrameObject<MultiDocumentState>(
	(state, shape) => {
		const [backSheet, middleSheet, frontSheet] = calcMultiDocumentSheets(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		);
		const toPath = (sheet: Rect): string =>
			buildDocumentPath(sheet.x, sheet.y, sheet.width, sheet.height);
		const middlePath = toPath(middleSheet);
		const frontPath = toPath(frontSheet);
		const outsideMiddleId = buildClipId(state.id, "middle");
		const outsideFrontId = buildClipId(state.id, "front");

		return (
			<g data-kind="object" data-id={state.id} style={{ cursor: "grab" }}>
				<defs>
					<clipPath id={outsideFrontId}>
						<path
							d={buildOutsideSheetClipPath(
								frontPath,
								state.width,
								state.height,
							)}
							clipRule="evenodd"
						/>
					</clipPath>
					<clipPath id={outsideMiddleId}>
						<path
							d={buildOutsideSheetClipPath(
								middlePath,
								state.width,
								state.height,
							)}
							clipRule="evenodd"
						/>
					</clipPath>
				</defs>
				<g transform={shape.transform}>
					<g clipPath={`url(#${outsideFrontId})`}>
						<g clipPath={`url(#${outsideMiddleId})`}>
							<Sheet d={toPath(backSheet)} shape={shape} />
						</g>
						<Sheet d={middlePath} shape={shape} />
					</g>
					<Sheet d={frontPath} shape={shape} />
				</g>
			</g>
		);
	},
);
