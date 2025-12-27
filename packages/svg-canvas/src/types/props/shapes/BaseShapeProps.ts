import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { DiagramType } from "../../core/DiagramType";
import type { BaseShapeFeatures } from "../../data/shapes/BaseShapeData";
import type { BaseShapeState } from "../../state/shapes/BaseShapeState";

/**
 * Props for BaseShape component
 * Uses center coordinates (cx, cy) instead of top-left (x, y)
 */
export type BaseShapeProps = CreateDiagramProps<
	BaseShapeState,
	typeof BaseShapeFeatures,
	{
		type: DiagramType;
		transform: string;
		children: React.ReactNode;
	}
>;
