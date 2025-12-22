import {
	TextAreaNode,
	TextAreaNodeMinimap,
} from "../../components/nodes/TextAreaNode";
import { TextAreaNodeDefaultData } from "../../constants/data/nodes/TextAreaNodeDefaultData";
import { TextAreaNodeMenuConfig } from "../../constants/menu/nodes/TextAreaNodeMenuConfig";
import { TextAreaNodeDefaultState } from "../../constants/state/nodes/TextAreaNodeDefaultState";
import type { TextAreaNodeData } from "../../types/data/nodes/TextAreaNodeData";
import { TextAreaNodeFeatures } from "../../types/data/nodes/TextAreaNodeData";
import type { TextAreaNodeProps } from "../../types/props/nodes/TextAreaNodeProps";
import type { TextAreaNodeState } from "../../types/state/nodes/TextAreaNodeState";
import { createTextAreaNodeState } from "../../utils/nodes/textAreaNode/createTextAreaNodeState";
import { isTextAreaNodeData } from "../../utils/nodes/textAreaNode/isTextAreaNodeData";
import { mapTextAreaNodeDataToState } from "../../utils/nodes/textAreaNode/mapTextAreaNodeDataToState";
import { textAreaNodeStateToData } from "../../utils/nodes/textAreaNode/mapTextAreaNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * TextAreaNode Atlas
 *
 * Complete index and registry for TextAreaNode-related components.
 * This atlas provides centralized access to all TextAreaNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * TextAreaNode Atlas Type Definition
 */
type TextAreaNodeAtlas = DiagramAtlas<
	TextAreaNodeData,
	TextAreaNodeState,
	TextAreaNodeProps
>;

/**
 * TextAreaNode Atlas Implementation
 */
export const TextAreaNodeAtlas: TextAreaNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "TextAreaNode",
	features: TextAreaNodeFeatures,
	menuConfig: TextAreaNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: TextAreaNodeDefaultData,
	defaultState: TextAreaNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: TextAreaNode,
	minimapComponent: TextAreaNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createTextAreaNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapTextAreaNodeDataToState as DataToStateMapper,
	stateToData: textAreaNodeStateToData as StateToDataMapper,
	validateData: isTextAreaNodeData as DiagramDataValidator,
};
