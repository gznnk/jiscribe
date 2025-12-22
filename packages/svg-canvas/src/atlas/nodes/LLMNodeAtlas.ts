import { LLMNode, LLMNodeMinimap } from "../../components/nodes/LLMNode";
import { LLMNodeDefaultData } from "../../constants/data/nodes/LLMNodeDefaultData";
import { LLMNodeMenuConfig } from "../../constants/menu/nodes/LLMNodeMenuConfig";
import { LLMNodeDefaultState } from "../../constants/state/nodes/LLMNodeDefaultState";
import { LLMNodeFeatures } from "../../types/data/nodes/LLMNodeData";
import type { LLMNodeData } from "../../types/data/nodes/LLMNodeData";
import type { LLMNodeProps } from "../../types/props/nodes/LLMNodeProps";
import type { LLMNodeState } from "../../types/state/nodes/LLMNodeState";
import { createLLMNodeState } from "../../utils/nodes/llmNode/createLLMNodeState";
import { isLLMNodeData } from "../../utils/nodes/llmNode/isLLMNodeData";
import { mapLLMNodeDataToState } from "../../utils/nodes/llmNode/mapLLMNodeDataToState";
import { llmNodeStateToData } from "../../utils/nodes/llmNode/mapLLMNodeStateToData";
import { transformLLMNodeItems } from "../../utils/nodes/llmNode/transformLLMNodeItems";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * LLMNode Atlas
 *
 * Complete index and registry for LLMNode-related components.
 * This atlas provides centralized access to all LLMNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * LLMNode Atlas Type Definition
 */
type LLMNodeAtlas = DiagramAtlas<LLMNodeData, LLMNodeState, LLMNodeProps>;

/**
 * LLMNode Atlas Implementation
 */
export const LLMNodeAtlas: LLMNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "LLMNode",
	features: LLMNodeFeatures,
	menuConfig: LLMNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: LLMNodeDefaultData,
	defaultState: LLMNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: LLMNode,
	minimapComponent: LLMNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createLLMNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: transformLLMNodeItems,
	dataToState: mapLLMNodeDataToState as DataToStateMapper,
	stateToData: llmNodeStateToData as StateToDataMapper,
	validateData: isLLMNodeData as DiagramDataValidator,
};
