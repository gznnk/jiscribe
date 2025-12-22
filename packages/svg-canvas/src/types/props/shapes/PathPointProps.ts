import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { PathPointState } from "../../state/shapes/PathPointState";

/**
 * Props for PathPoint component
 */
export type PathPointProps = CreateDiagramProps<
	PathPointState,
	object,
	{
		hidden?: boolean;
		isTransparent?: boolean;
		zoom?: number;
	}
>;
