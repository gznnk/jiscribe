import { memo } from "react";

import { useObjectSvgDefsRegistry } from "../objects/registry/ObjectSvgDefsRegistryContext";

/**
 * The canvas-wide `<defs>`. Holds nothing of its own: every entry comes from a
 * registered object type's `svgDefs` (see ObjectSvgDefsRegistry), so a type can
 * ship the filters / gradients it references without the core knowing it exists.
 */
const CanvasDefsComponent: React.FC = () => {
	const svgDefsRegistry = useObjectSvgDefsRegistry();

	return (
		<defs>
			{svgDefsRegistry.all().map(({ type, Component }) => (
				<Component key={type} />
			))}
		</defs>
	);
};

export const CanvasDefs = memo(CanvasDefsComponent);
