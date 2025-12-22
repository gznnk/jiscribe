import {
	HtmlGenNode,
	HtmlGenNodeMinimap,
} from "../../components/nodes/HtmlGenNode";
import { HtmlGenNodeDefaultData } from "../../constants/data/nodes/HtmlGenNodeDefaultData";
import { HtmlGenNodeMenuConfig } from "../../constants/menu/nodes/HtmlGenNodeMenuConfig";
import { HtmlGenNodeDefaultState } from "../../constants/state/nodes/HtmlGenNodeDefaultState";
import { HtmlGenNodeFeatures } from "../../types/data/nodes/HtmlGenNodeData";
import type { HtmlGenNodeData } from "../../types/data/nodes/HtmlGenNodeData";
import type { HtmlGenNodeProps } from "../../types/props/nodes/HtmlGenNodeProps";
import type { HtmlGenNodeState } from "../../types/state/nodes/HtmlGenNodeState";
import { createHtmlGenNodeState } from "../../utils/nodes/htmlGenNode/createHtmlGenNodeState";
import { isHtmlGenNodeData } from "../../utils/nodes/htmlGenNode/isHtmlGenNodeData";
import { mapHtmlGenNodeDataToState } from "../../utils/nodes/htmlGenNode/mapHtmlGenNodeDataToState";
import { htmlGenNodeStateToData } from "../../utils/nodes/htmlGenNode/mapHtmlGenNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * HtmlGenNode Atlas
 *
 * Complete index and registry for HtmlGenNode-related components.
 * This atlas provides centralized access to all HtmlGenNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * HtmlGenNode Atlas Type Definition
 */
type HtmlGenNodeAtlas = DiagramAtlas<
	HtmlGenNodeData,
	HtmlGenNodeState,
	HtmlGenNodeProps
>;

/**
 * HtmlGenNode Atlas Implementation
 */
export const HtmlGenNodeAtlas: HtmlGenNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "HtmlGenNode",
	features: HtmlGenNodeFeatures,
	menuConfig: HtmlGenNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: HtmlGenNodeDefaultData,
	defaultState: HtmlGenNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: HtmlGenNode,
	minimapComponent: HtmlGenNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createHtmlGenNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapHtmlGenNodeDataToState as DataToStateMapper,
	stateToData: htmlGenNodeStateToData as StateToDataMapper,
	validateData: isHtmlGenNodeData as DiagramDataValidator,
};
