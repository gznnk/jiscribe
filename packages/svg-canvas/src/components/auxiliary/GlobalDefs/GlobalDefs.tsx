import { memo } from "react";

const GlobalDefsComponent = () => {
	return (
		<defs>
			{/* Sticky Note Blur Filter */}
			<filter id="sticky-blur">
				<feGaussianBlur in="SourceGraphic" stdDeviation="2" />
			</filter>
		</defs>
	);
};

export const GlobalDefs = memo(GlobalDefsComponent);
