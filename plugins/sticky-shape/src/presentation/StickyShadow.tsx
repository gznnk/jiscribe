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
 * The paper's drop shadow: a solid rectangle under the note plus the eight
 * pieces of its soft edge (see StickyShadowConstants for why it is drawn this
 * way rather than blurred). Inert to the pointer — the note itself is the
 * grab target, and the shadow reaches past it on every side.
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

	return (
		<g transform={transform} pointerEvents="none">
			<rect
				x={left}
				y={top}
				width={width}
				height={height}
				fill="#000"
				fillOpacity={STICKY_SHADOW_OPACITY}
			/>
			<rect
				x={left}
				y={top - spread}
				width={width}
				height={spread}
				fill={paint(STICKY_SHADOW_GRADIENT_IDS.top)}
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
