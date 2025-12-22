import type { PageDesignNodeFeatures } from "../../data/nodes/PageDesignNodeData";
import type { PageDesignNodeState } from "../../state/nodes/PageDesignNodeState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Type of the PageDesignNode component props.
 */
export type PageDesignNodeProps = CreateDiagramProps<
	PageDesignNodeState,
	typeof PageDesignNodeFeatures
>;
