import type { StickyFeatures } from "../../data/diagrams/StickyData";
import type { StickyState } from "../../state/diagrams/StickyState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for Sticky component
 */
export type StickyProps = CreateDiagramProps<
	StickyState,
	typeof StickyFeatures
>;
