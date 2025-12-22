import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { RectangleFeatures } from "../../data/shapes/RectangleData";
import type { RectangleState } from "../../state/shapes/RectangleState";

/**
 * Props for Rectangle component
 */
export type RectangleProps = CreateDiagramProps<
	RectangleState,
	typeof RectangleFeatures
>;
