import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { PathFeatures } from "../../data/shapes/PathData";
import type { PathState } from "../../state/shapes/PathState";

/**
 * Props for Path component
 */
export type PathProps = CreateDiagramProps<
	PathState,
	typeof PathFeatures,
	{
		dragEnabled?: boolean;
		preserveEndpoints?: boolean;
	}
>;
