import { memo } from "react";

import {
	STICKY_SHADOW_BLUR,
	STICKY_SHADOW_FILTER_ID,
} from "./StickyShadowConstants";

/** Shared SVG resources the sticky body references (see `ObjectTypeDefinition.svgDefs`). */
const StickyDefsComponent: React.FC = () => (
	<filter id={STICKY_SHADOW_FILTER_ID}>
		<feGaussianBlur in="SourceGraphic" stdDeviation={STICKY_SHADOW_BLUR} />
	</filter>
);

export const StickyDefs = memo(StickyDefsComponent);
