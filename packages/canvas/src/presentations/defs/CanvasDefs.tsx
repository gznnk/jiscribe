import { memo } from "react";

import { StickyFilters } from "./StickyFilters";

const CanvasDefsComponent: React.FC = () => (
	<defs>
		<StickyFilters />
	</defs>
);

export const CanvasDefs = memo(CanvasDefsComponent);
