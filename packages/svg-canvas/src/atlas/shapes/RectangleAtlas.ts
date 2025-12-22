import { Rectangle, RectangleMinimap } from "../../components/shapes/Rectangle";
import { RectangleDefaultData } from "../../constants/data/shapes/RectangleDefaultData";
import { RectangleMenuConfig } from "../../constants/menu/shapes/RectangleMenuConfig";
import { RectangleDefaultState } from "../../constants/state/shapes/RectangleDefaultState";
import type { RectangleData } from "../../types/data/shapes/RectangleData";
import { RectangleFeatures } from "../../types/data/shapes/RectangleData";
import type { RectangleProps } from "../../types/props/shapes/RectangleProps";
import type { RectangleState } from "../../types/state/shapes/RectangleState";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import { createRectangleState } from "../../utils/shapes/rectangle/createRectangleState";
import { isRectangleData } from "../../utils/shapes/rectangle/isRectangleData";
import { rectangleDataToState } from "../../utils/shapes/rectangle/mapRectangleDataToState";
import { rectangleStateToData } from "../../utils/shapes/rectangle/mapRectangleStateToData";
import {
	type DataToStateMapper,
	type DiagramAtlas,
	type DiagramDataValidator,
	type StateToDataMapper,
} from "../DiagramAtlas";

/**
 * Rectangle Shape Atlas
 *
 * Complete index and registry for Rectangle shape-related components.
 * This atlas provides centralized access to all Rectangle-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * Rectangle Shape Atlas Type Definition
 */
type RectangleAtlas = DiagramAtlas<
	RectangleData,
	RectangleState,
	RectangleProps
>;

/**
 * Rectangle Shape Atlas Implementation
 */
export const RectangleAtlas: RectangleAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Rectangle",
	features: RectangleFeatures,
	menuConfig: RectangleMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: RectangleDefaultData,
	defaultState: RectangleDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Rectangle,
	minimapComponent: RectangleMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createRectangleState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: rectangleDataToState as DataToStateMapper,
	stateToData: rectangleStateToData as StateToDataMapper,
	validateData: isRectangleData as DiagramDataValidator,
};
