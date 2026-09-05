import { memo } from "react";

import {
	STICKY_SHADOW_GRADIENT_IDS,
	STICKY_SHADOW_OPACITY,
} from "./StickyShadowConstants";

/**
 * Where each side's fade runs, as the gradient vector in the piece's own box:
 * from the edge that touches the shadow (solid) to the one facing away (clear).
 */
const EDGE_VECTORS = {
	bottom: { x1: 0, y1: 0, x2: 0, y2: 1 },
	left: { x1: 1, y1: 0, x2: 0, y2: 0 },
	right: { x1: 0, y1: 0, x2: 1, y2: 0 },
} as const;

/**
 * Where each corner's fade radiates from: the shadow's corner, which is the one
 * corner of the piece that touches it.
 */
const CORNER_CENTERS = {
	topLeft: { cx: 1, cy: 1 },
	topRight: { cx: 0, cy: 1 },
	bottomLeft: { cx: 1, cy: 0 },
	bottomRight: { cx: 0, cy: 0 },
} as const;

/** The two stops every piece fades between: the shadow's own black, then nothing. */
const ShadowStops: React.FC = () => (
	<>
		<stop offset="0" stopColor="#000" stopOpacity={STICKY_SHADOW_OPACITY} />
		<stop offset="1" stopColor="#000" stopOpacity="0" />
	</>
);

/**
 * Shared SVG resources the sticky references (see `ObjectTypeDefinition.svgDefs`):
 * the seven gradients its shadow's soft edge is painted with. Default
 * gradientUnits (objectBoundingBox) maps the stops over each piece's own box, so
 * one set serves every sticky whatever its size.
 */
const StickyDefsComponent: React.FC = () => (
	<>
		{Object.entries(EDGE_VECTORS).map(([side, vector]) => (
			<linearGradient
				key={side}
				id={STICKY_SHADOW_GRADIENT_IDS[side as keyof typeof EDGE_VECTORS]}
				{...vector}
			>
				<ShadowStops />
			</linearGradient>
		))}
		{Object.entries(CORNER_CENTERS).map(([corner, center]) => (
			<radialGradient
				key={corner}
				id={STICKY_SHADOW_GRADIENT_IDS[corner as keyof typeof CORNER_CENTERS]}
				r="1"
				{...center}
			>
				<ShadowStops />
			</radialGradient>
		))}
	</>
);

export const StickyDefs = memo(StickyDefsComponent);
