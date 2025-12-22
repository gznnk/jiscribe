import { AgentNode, AgentNodeMinimap } from "../../components/nodes/AgentNode";
import { AgentNodeDefaultData } from "../../constants/data/nodes/AgentNodeDefaultData";
import { AgentNodeMenuConfig } from "../../constants/menu/nodes/AgentNodeMenuConfig";
import { AgentNodeDefaultState } from "../../constants/state/nodes/AgentNodeDefaultState";
import type { AgentNodeData } from "../../types/data/nodes/AgentNodeData";
import { AgentNodeFeatures } from "../../types/data/nodes/AgentNodeData";
import type { AgentNodeProps } from "../../types/props/nodes/AgentNodeProps";
import type { AgentNodeState } from "../../types/state/nodes/AgentNodeState";
import { createAgentNodeState } from "../../utils/nodes/agentNode/createAgentNodeState";
import { isAgentNodeData } from "../../utils/nodes/agentNode/isAgentNodeData";
import { mapAgentNodeDataToState } from "../../utils/nodes/agentNode/mapAgentNodeDataToState";
import { agentNodeStateToData } from "../../utils/nodes/agentNode/mapAgentNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * AgentNode Atlas
 *
 * Complete index and registry for AgentNode-related components.
 * This atlas provides centralized access to all AgentNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * AgentNode Atlas Type Definition
 */
type AgentNodeAtlas = DiagramAtlas<
	AgentNodeData,
	AgentNodeState,
	AgentNodeProps
>;

/**
 * AgentNode Atlas Implementation
 */
export const AgentNodeAtlas: AgentNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "AgentNode",
	features: AgentNodeFeatures,
	menuConfig: AgentNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: AgentNodeDefaultData,
	defaultState: AgentNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: AgentNode,
	minimapComponent: AgentNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createAgentNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapAgentNodeDataToState as DataToStateMapper,
	stateToData: agentNodeStateToData as StateToDataMapper,
	validateData: isAgentNodeData as DiagramDataValidator,
};
