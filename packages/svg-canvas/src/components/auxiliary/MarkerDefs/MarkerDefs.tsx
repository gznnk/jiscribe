import type React from "react";
import { memo } from "react";

import { CircleMarker } from "./Circle";
import { ConcaveTriangleMarker } from "./ConcaveTriangle";
import { FilledDiamondMarker } from "./FilledDiamond";
import { FilledTriangleMarker } from "./FilledTriangle";
import { HollowDiamondMarker } from "./HollowDiamond";
import { HollowTriangleMarker } from "./HollowTriangle";
import { OpenArrowMarker } from "./OpenArrow";

/**
 * MarkerDefs component.
 * Defines all SVG markers for arrow heads in a <defs> element.
 * These markers can be referenced by SVG paths using marker-start and marker-end attributes.
 * Markers use context-stroke to inherit the color from the path.
 * Includes standard arrows and UML relationship markers.
 */
const MarkerDefsComponent: React.FC = () => {
	return (
		<defs>
			<FilledTriangleMarker />
			<ConcaveTriangleMarker />
			<OpenArrowMarker />
			<HollowTriangleMarker />
			<FilledDiamondMarker />
			<HollowDiamondMarker />
			<CircleMarker />
		</defs>
	);
};

export const MarkerDefs = memo(MarkerDefsComponent);
