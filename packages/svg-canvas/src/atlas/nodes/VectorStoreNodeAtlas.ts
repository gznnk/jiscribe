import {
	VectorStoreNode,
	VectorStoreNodeMinimap,
} from "../../components/nodes/VectorStoreNode";
import { VectorStoreNodeDefaultData } from "../../constants/data/nodes/VectorStoreNodeDefaultData";
import { VectorStoreNodeMenuConfig } from "../../constants/menu/nodes/VectorStoreNodeMenuConfig";
import { VectorStoreNodeDefaultState } from "../../constants/state/nodes/VectorStoreNodeDefaultState";
import type { VectorStoreNodeData } from "../../types/data/nodes/VectorStoreNodeData";
import { VectorStoreNodeFeatures } from "../../types/data/nodes/VectorStoreNodeData";
import type { VectorStoreNodeProps } from "../../types/props/nodes/VectorStoreNodeProps";
import type { VectorStoreNodeState } from "../../types/state/nodes/VectorStoreNodeState";
import { createVectorStoreNodeState } from "../../utils/nodes/vectorStoreNode/createVectorStoreNodeState";
import { isVectorStoreNodeData } from "../../utils/nodes/vectorStoreNode/isVectorStoreNodeData";
import { mapVectorStoreNodeDataToState } from "../../utils/nodes/vectorStoreNode/mapVectorStoreNodeDataToState";
import { vectorStoreNodeStateToData } from "../../utils/nodes/vectorStoreNode/mapVectorStoreNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * VectorStoreNode Atlas
 *
 * Complete index and registry for VectorStoreNode-related components.
 * This atlas provides centralized access to all VectorStoreNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * VectorStoreNode Atlas Type Definition
 */
type VectorStoreNodeAtlas = DiagramAtlas<
	VectorStoreNodeData,
	VectorStoreNodeState,
	VectorStoreNodeProps
>;

/**
 * VectorStoreNode Atlas Implementation
 */
export const VectorStoreNodeAtlas: VectorStoreNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "VectorStoreNode",
	features: VectorStoreNodeFeatures,
	menuConfig: VectorStoreNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: VectorStoreNodeDefaultData,
	defaultState: VectorStoreNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: VectorStoreNode,
	minimapComponent: VectorStoreNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createVectorStoreNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapVectorStoreNodeDataToState as DataToStateMapper,
	stateToData: vectorStoreNodeStateToData as StateToDataMapper,
	validateData: isVectorStoreNodeData as DiagramDataValidator,
};
