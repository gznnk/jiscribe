import { memo } from "react";

import {
	STICKY_SHADOW_GRADIENT_IDS,
	STICKY_SHADOW_OFFSET_Y,
	STICKY_SHADOW_OPACITY,
	STICKY_SHADOW_SPREAD,
} from "./StickyShadowConstants";

type StickyShadowProps = {
	/** The paper's width in local units; the shadow takes the same. */
	width: number;
	/** The paper's height in local units; the shadow takes the same. */
	height: number;
	/** The sticky's SVG transform matrix, so the shadow follows the note. */
	transform: string;
};

const paint = (id: string): string => `url(#${id})`;

/**
 * The paper's drop shadow: the solid strip below the note plus the seven
 * pieces of its soft edge — everything but the top edge, which stays under the
 * paper (see StickyShadowConstants for why it is drawn this way rather than
 * blurred). Inert to the pointer — the note itself is the grab target, and the
 * shadow reaches past it at the sides and the bottom.
 */
const StickyShadowComponent: React.FC<StickyShadowProps> = ({
	width,
	height,
	transform,
}) => {
	const left = -width / 2;
	const right = width / 2;
	const top = -height / 2 + STICKY_SHADOW_OFFSET_Y;
	const bottom = height / 2 + STICKY_SHADOW_OFFSET_Y;
	const spread = STICKY_SHADOW_SPREAD;

	// The solid middle only shows below the paper, so only that strip is
	// painted: what the paper covers would still cost its pixels (#133).
	const paperBottom = height / 2;

	return (
		<g transform={transform} pointerEvents="none">
			<rect
				x={left}
				y={paperBottom}
				width={width}
				height={bottom - paperBottom}
				fill="#000"
				fillOpacity={STICKY_SHADOW_OPACITY}
			/>
			<rect
				x={left}
				y={bottom}
				width={width}
				height={spread}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.bottom)}
			/>
			<rect
				x={left - spread}
				y={top}
				width={spread}
				height={height}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.left)}
			/>
			<rect
				x={right}
				y={top}
				width={spread}
				height={height}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.right)}
			/>
			<rect
				x={left - spread}
				y={top - spread}
				width={spread}
				height={spread}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.topLeft)}
			/>
			<rect
				x={right}
				y={top - spread}
				width={spread}
				height={spread}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.topRight)}
			/>
			<rect
				x={left - spread}
				y={bottom}
				width={spread}
				height={spread}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.bottomLeft)}
			/>
			<rect
				x={right}
				y={bottom}
				width={spread}
				height={spread}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.bottomRight)}
			/>
		</g>
	);
};

export const StickyShadow = memo(StickyShadowComponent);
