import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { DiagramType } from "../../core/DiagramType";
import type { BaseShapeFeatures } from "../../data/shapes/BaseShapeData";
import type { BaseShapeState } from "../../state/shapes/BaseShapeState";

/**
 * Props for BaseShape component
 */
export type BaseShapeProps = CreateDiagramProps<
	BaseShapeState,
	typeof BaseShapeFeatures
> & {
	type: DiagramType;
	transform: string;
	children: React.ReactNode;
};
