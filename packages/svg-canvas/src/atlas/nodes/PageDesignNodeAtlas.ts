import {
	PageDesignNode,
	PageDesignNodeMinimap,
} from "../../components/nodes/PageDesignNode";
import { PageDesignNodeDefaultData } from "../../constants/data/nodes/PageDesignNodeDefaultData";
import { PageDesignNodeMenuConfig } from "../../constants/menu/nodes/PageDesignNodeMenuConfig";
import { PageDesignNodeDefaultState } from "../../constants/state/nodes/PageDesignNodeDefaultState";
import type { PageDesignNodeData } from "../../types/data/nodes/PageDesignNodeData";
import { PageDesignNodeFeatures } from "../../types/data/nodes/PageDesignNodeData";
import type { PageDesignNodeProps } from "../../types/props/nodes/PageDesignNodeProps";
import type { PageDesignNodeState } from "../../types/state/nodes/PageDesignNodeState";
import { createPageDesignNodeState } from "../../utils/nodes/pageDesignNode/createPageDesignNodeState";
import { isPageDesignNodeData } from "../../utils/nodes/pageDesignNode/isPageDesignNodeData";
import { mapPageDesignNodeDataToState } from "../../utils/nodes/pageDesignNode/mapPageDesignNodeDataToState";
import { pageDesignNodeStateToData } from "../../utils/nodes/pageDesignNode/mapPageDesignNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DiagramAtlas,
	DataToStateMapper,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * PageDesignNode Atlas
 *
 * Complete index and registry for PageDesignNode-related components.
 * This atlas provides centralized access to all PageDesignNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * PageDesignNode Atlas Type Definition
 */
type PageDesignNodeAtlas = DiagramAtlas<
	PageDesignNodeData,
	PageDesignNodeState,
	PageDesignNodeProps
>;

/**
 * PageDesignNode Atlas Implementation
 */
export const PageDesignNodeAtlas: PageDesignNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "PageDesignNode",
	features: PageDesignNodeFeatures,
	menuConfig: PageDesignNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: PageDesignNodeDefaultData,
	defaultState: PageDesignNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: PageDesignNode,
	minimapComponent: PageDesignNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createPageDesignNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapPageDesignNodeDataToState as DataToStateMapper,
	stateToData: pageDesignNodeStateToData as StateToDataMapper,
	validateData: isPageDesignNodeData as DiagramDataValidator,
};
