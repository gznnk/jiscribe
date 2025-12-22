import {
	ImageGenNode,
	ImageGenNodeMinimap,
} from "../../components/nodes/ImageGenNode";
import { ImageGenNodeDefaultData } from "../../constants/data/nodes/ImageGenNodeDefaultData";
import { ImageGenNodeMenuConfig } from "../../constants/menu/nodes/ImageGenNodeMenuConfig";
import { ImageGenNodeDefaultState } from "../../constants/state/nodes/ImageGenNodeDefaultState";
import type { ImageGenNodeData } from "../../types/data/nodes/ImageGenNodeData";
import { ImageGenNodeFeatures } from "../../types/data/nodes/ImageGenNodeData";
import type { ImageGenNodeProps } from "../../types/props/nodes/ImageGenNodeProps";
import type { ImageGenNodeState } from "../../types/state/nodes/ImageGenNodeState";
import { createImageGenNodeState } from "../../utils/nodes/imageGenNode/createImageGenNodeState";
import { isImageGenNodeData } from "../../utils/nodes/imageGenNode/isImageGenNodeData";
import { mapImageGenNodeDataToState } from "../../utils/nodes/imageGenNode/mapImageGenNodeDataToState";
import { imageGenNodeStateToData } from "../../utils/nodes/imageGenNode/mapImageGenNodeStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * ImageGenNode Atlas
 *
 * Complete index and registry for ImageGenNode-related components.
 * This atlas provides centralized access to all ImageGenNode-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * ImageGenNode Atlas Type Definition
 */
type ImageGenNodeAtlas = DiagramAtlas<
	ImageGenNodeData,
	ImageGenNodeState,
	ImageGenNodeProps
>;

/**
 * ImageGenNode Atlas Implementation
 */
export const ImageGenNodeAtlas: ImageGenNodeAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "ImageGenNode",
	features: ImageGenNodeFeatures,
	menuConfig: ImageGenNodeMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: ImageGenNodeDefaultData,
	defaultState: ImageGenNodeDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: ImageGenNode,
	minimapComponent: ImageGenNodeMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createImageGenNodeState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapImageGenNodeDataToState as DataToStateMapper,
	stateToData: imageGenNodeStateToData as StateToDataMapper,
	validateData: isImageGenNodeData as DiagramDataValidator,
};
