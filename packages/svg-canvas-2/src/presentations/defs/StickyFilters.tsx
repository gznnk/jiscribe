import { memo } from "react";

const StickyFiltersComponent: React.FC = () => (
	<>
		<filter id="sticky-blur">
			<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
		</filter>
	</>
);

export const StickyFilters = memo(StickyFiltersComponent);
