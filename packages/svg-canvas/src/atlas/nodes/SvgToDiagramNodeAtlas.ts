import {
	SvgToDiagramNode,
	SvgToDiagramNodeMinimap,
} from "../../components/nodes/SvgToDiagramNode";
import { SvgToDiagramNodeDefaultData } from "../../constants/data/nodes/SvgToDiagramNodeDefaultData";
import { SvgToDiagramNodeMenuConfig } from "../../constants/menu/nodes/SvgToDiagramNodeMenuConfig";
import { SvgToDiagramNodeDefaultState } from "../../constants/state/nodes/SvgToDiagramNodeDefaultState";
import type { SvgToDiagramNodeData } from "../../types/data/nodes/SvgToDiagramNodeData";
import { SvgToDiagramNodeFeatures } from "../../types/data/nodes/SvgToDiagramNodeData";
import type { SvgToDiagramNodeProps } from "../../types/props/nodes/SvgToDiagramNodeProps";
import type { SvgToDiagramNodeState } from "../../types/state/nodes/SvgToDiagramNodeState";
import { createSvgToDiagramNodeState } from "../../utils/nodes/svgToDiagramNode/createSvgToDiagramNodeState";
import { isSvgToDiagramNodeData } from "../../utils/nodes/svgToDiagramNode/isSvgToDiagramNodeData";
import { mapSvgToDiagramNodeDataToState } from "../../utils/nodes/svgToDiagramNode/mapSvgToDiagramNodeDataToState";
import { svgToDiagramNodeStateToData } from "../../utils/nodes/svgToDiagramNode/mapSvgToDiagramNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DiagramAtlas,
	DataToStateMapper,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * SvgToDiagramNode Atlas
 *
 * Complete index and registry for SvgToDiagramNode-related components.
 * This atlas provides centralized access to all SvgToDiagramNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * SvgToDiagramNode Atlas Type Definition
 */
type SvgToDiagramNodeAtlas = DiagramAtlas<
	SvgToDiagramNodeData,
	SvgToDiagramNodeState,
	SvgToDiagramNodeProps
>;

/**
 * SvgToDiagramNode Atlas Implementation
 */
export const SvgToDiagramNodeAtlas: SvgToDiagramNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "SvgToDiagramNode",
	features: SvgToDiagramNodeFeatures,
	menuConfig: SvgToDiagramNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: SvgToDiagramNodeDefaultData,
	defaultState: SvgToDiagramNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: SvgToDiagramNode,
	minimapComponent: SvgToDiagramNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createSvgToDiagramNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapSvgToDiagramNodeDataToState as DataToStateMapper,
	stateToData: svgToDiagramNodeStateToData as StateToDataMapper,
	validateData: isSvgToDiagramNodeData as DiagramDataValidator,
};
