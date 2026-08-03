import { memo } from "react";

/** Shared SVG resources the sticky body references (see `ObjectTypeDefinition.svgDefs`). */
const StickyDefsComponent: React.FC = () => (
	<filter id="sticky-blur">
		<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
	</filter>
);

export const StickyDefs = memo(StickyDefsComponent);
