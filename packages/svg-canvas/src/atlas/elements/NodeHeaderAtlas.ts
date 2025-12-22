import { NodeHeaderMinimap } from "../../components/elements/NodeHeader";
import { NodeHeaderDefaultData } from "../../constants/data/elements/NodeHeaderDefaultData";
import { NodeHeaderDefaultState } from "../../constants/state/elements/NodeHeaderDefaultState";
import type { NodeHeaderData } from "../../types/data/elements/NodeHeaderData";
import { NodeHeaderFeatures } from "../../types/data/elements/NodeHeaderData";
import type { NodeHeaderProps } from "../../types/props/elements/NodeHeaderProps";
import type { NodeHeaderState } from "../../types/state/elements/NodeHeaderState";
import { createNodeHeaderState } from "../../utils/elements/nodeHeader/createNodeHeaderState";
import { isNodeHeaderData } from "../../utils/elements/nodeHeader/isNodeHeaderData";
import { mapNodeHeaderDataToState } from "../../utils/elements/nodeHeader/mapNodeHeaderDataToState";
import { mapNodeHeaderStateToData } from "../../utils/elements/nodeHeader/mapNodeHeaderStateToData";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";
import { DummyComponent, dummyImplementation } from "../DiagramAtlas";

/**
 * NodeHeader Element Atlas
 *
 * Complete index and registry for NodeHeader element-related components.
 * This atlas provides centralized access to all NodeHeader-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * NodeHeader Element Atlas Type Definition
 */
type NodeHeaderAtlas = DiagramAtlas<
	NodeHeaderData,
	NodeHeaderState,
	NodeHeaderProps
>;

/**
 * NodeHeader Element Atlas Implementation
 */
export const NodeHeaderAtlas: NodeHeaderAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "NodeHeader",
	features: NodeHeaderFeatures,
	menuConfig: undefined,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: NodeHeaderDefaultData,
	defaultState: NodeHeaderDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: DummyComponent, // Using dummy since not registering to registry
	minimapComponent: NodeHeaderMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createNodeHeaderState,
	export: undefined,
	calcConnectPointPosition: dummyImplementation,
	transformItems: undefined,
	dataToState: mapNodeHeaderDataToState as DataToStateMapper,
	stateToData: mapNodeHeaderStateToData as StateToDataMapper,
	validateData: isNodeHeaderData as DiagramDataValidator,
};
