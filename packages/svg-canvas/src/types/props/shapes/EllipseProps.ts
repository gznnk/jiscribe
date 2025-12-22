import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { EllipseFeatures } from "../../data/shapes/EllipseData";
import type { EllipseState } from "../../state/shapes/EllipseState";

/**
 * Props for Ellipse component
 */
export type EllipseProps = CreateDiagramProps<
	EllipseState,
	typeof EllipseFeatures
>;
