import {
	createFrameObject,
	formatPolygonPoints,
	ShapeBodyPolygon,
} from "@jiscribe/canvas-sdk";

import { calcUmlPackagePoints } from "./calcUmlPackagePoints";
import { UmlPackageTabDivider } from "./UmlPackageBoxStyled";
import {
	calcUmlPackageTabHeight,
	UML_PACKAGE_TAB_WIDTH_RATIO,
} from "../schema/UmlPackageDoc";
import type { UmlPackageState } from "../state/UmlPackageState";

/**
 * Package presentation: one tabbed silhouette, plus the line that closes the
 * body's top edge under the tab. Shared Frame logic (transform, color resolution,
 * the text overlay placed by calcUmlPackageTextRegion, memo) lives in
 * createFrameObject.
 *
 * The wrapping <g> carries the object's data-kind/data-id, so the silhouette and
 * the line beside it stay one object as far as the DOM contract is concerned.
 *
 * Order matters: the silhouette (fill included) is laid down first and the line
 * over it, so the line shows its whole width. Drawing a filled tab over a body
 * rect instead — the way the shape is drawn by hand — would cover the inner half
 * of that edge's stroke and leave the boundary looking half as thick as the
 * outline around it.
 */
export const UmlPackageBox = createFrameObject<UmlPackageState>(
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
		const left = -width / 2;
		const dividerY = -height / 2 + calcUmlPackageTabHeight(height);

		return (
			<g data-kind={dataKind} data-id={dataId} transform={transform}>
				<ShapeBodyPolygon
					points={formatPolygonPoints(
						calcUmlPackagePoints(left, -height / 2, width, height),
					)}
					strokeColor={strokeColor}
					fillColor={fillColor}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
				/>
				<UmlPackageTabDivider
					x1={left}
					y1={dividerY}
					x2={left + width * UML_PACKAGE_TAB_WIDTH_RATIO}
					y2={dividerY}
					strokeColor={strokeColor}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
				/>
			</g>
		);
	},
);
