import { HubNode, HubNodeMinimap } from "../../components/nodes/HubNode";
import { HubNodeDefaultData } from "../../constants/data/nodes/HubNodeDefaultData";
import { HubNodeMenuConfig } from "../../constants/menu/nodes/HubNodeMenuConfig";
import { HubNodeDefaultState } from "../../constants/state/nodes/HubNodeDefaultState";
import type { HubNodeData } from "../../types/data/nodes/HubNodeData";
import { HubNodeFeatures } from "../../types/data/nodes/HubNodeData";
import type { HubNodeProps } from "../../types/props/nodes/HubNodeProps";
import type { HubNodeState } from "../../types/state/nodes/HubNodeState";
import { createHubNodeState } from "../../utils/nodes/hubNode/createHubNodeState";
import { isHubNodeData } from "../../utils/nodes/hubNode/isHubNodeData";
import { mapHubNodeDataToState } from "../../utils/nodes/hubNode/mapHubNodeDataToState";
import { hubNodeStateToData } from "../../utils/nodes/hubNode/mapHubNodeStateToData";
import { calcEllipseConnectPointPosition } from "../../utils/shapes/ellipse/calcEllipseConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * HubNode Atlas
 *
 * Complete index and registry for HubNode-related components.
 * This atlas provides centralized access to all HubNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * HubNode Atlas Type Definition
 */
type HubNodeAtlas = DiagramAtlas<HubNodeData, HubNodeState, HubNodeProps>;

/**
 * HubNode Atlas Implementation
 */
export const HubNodeAtlas: HubNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "HubNode",
	features: HubNodeFeatures,
	menuConfig: HubNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: HubNodeDefaultData,
	defaultState: HubNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: HubNode,
	minimapComponent: HubNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createHubNodeState,
	export: undefined,
	calcConnectPointPosition: calcEllipseConnectPointPosition,
	transformItems: undefined,
	dataToState: mapHubNodeDataToState as DataToStateMapper,
	stateToData: hubNodeStateToData as StateToDataMapper,
	validateData: isHubNodeData as DiagramDataValidator,
};
