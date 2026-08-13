import { createFrameObject, ShapeBodyPath } from "@jiscribe/canvas-sdk";

import {
	buildUmlComponentBodyPath,
	buildUmlComponentIconPaths,
} from "./buildUmlComponentPaths";
import type { UmlComponentState } from "../state/UmlComponentState";

/**
 * Component presentation: the box, with the UML 2 component icon in its top-right
 * corner. Shared Frame logic (transform, color resolution, the text overlay over
 * the whole box, memo) lives in createFrameObject.
 *
 * Every part is painted with the shape's own fill, in the order the icon's pieces
 * are listed: the tabs' fill is what hides the stretch of the icon body's left
 * edge they straddle. A shape filled `transparent` therefore shows those two
 * crossings, the fill hiding them being the only thing that closes the mark.
 */
export const UmlComponentBox = createFrameObject<UmlComponentState>(
	(state, shape) => {
		const {
			"data-kind": dataKind,
			"data-id": dataId,
			transform,
			strokeColor,
			fillColor,
			strokeWidth,
			strokeDasharray,
		} = shape;

		const { width, height } = state;

		return (
			<g data-kind={dataKind} data-id={dataId} transform={transform}>
				<ShapeBodyPath
					d={buildUmlComponentBodyPath(-width / 2, -height / 2, width, height)}
					strokeColor={strokeColor}
					fillColor={fillColor}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
				/>
				{buildUmlComponentIconPaths(width / 2, -height / 2).map((d) => (
					<ShapeBodyPath
						key={d}
						d={d}
						strokeColor={strokeColor}
						fillColor={fillColor}
						strokeWidth={strokeWidth}
						strokeDasharray={strokeDasharray}
					/>
				))}
			</g>
		);
	},
);
