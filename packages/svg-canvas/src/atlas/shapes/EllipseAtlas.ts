import { Ellipse, EllipseMinimap } from "../../components/shapes/Ellipse";
import { EllipseDefaultData } from "../../constants/data/shapes/EllipseDefaultData";
import { EllipseMenuConfig } from "../../constants/menu/shapes/EllipseMenuConfig";
import { EllipseDefaultState } from "../../constants/state/shapes/EllipseDefaultState";
import type { EllipseData } from "../../types/data/shapes/EllipseData";
import { EllipseFeatures } from "../../types/data/shapes/EllipseData";
import type { EllipseProps } from "../../types/props/shapes/EllipseProps";
import type { EllipseState } from "../../types/state/shapes/EllipseState";
import { calcEllipseConnectPointPosition } from "../../utils/shapes/ellipse/calcEllipseConnectPointPosition";
import { createEllipseState } from "../../utils/shapes/ellipse/createEllipseState";
import { isEllipseData } from "../../utils/shapes/ellipse/isEllipseData";
import { mapEllipseDataToState } from "../../utils/shapes/ellipse/mapEllipseDataToState";
import { ellipseStateToData } from "../../utils/shapes/ellipse/mapEllipseStateToData";
import type {
	DiagramAtlas,
	DataToStateMapper,
	StateToDataMapper,
	DiagramDataValidator,
} from "../DiagramAtlas";

/**
 * Ellipse Shape Atlas
 *
 * Complete index and registry for Ellipse shape-related components.
 * This atlas provides centralized access to all Ellipse-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * Ellipse Shape Atlas Type Definition
 */
type EllipseAtlas = DiagramAtlas<EllipseData, EllipseState, EllipseProps>;

/**
 * Ellipse Shape Atlas Implementation
 */
export const EllipseAtlas: EllipseAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Ellipse",
	features: EllipseFeatures,
	menuConfig: EllipseMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: EllipseDefaultData,
	defaultState: EllipseDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Ellipse,
	minimapComponent: EllipseMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createEllipseState,
	export: undefined,
	calcConnectPointPosition: calcEllipseConnectPointPosition,
	transformItems: undefined,
	dataToState: mapEllipseDataToState as DataToStateMapper,
	stateToData: ellipseStateToData as StateToDataMapper,
	validateData: isEllipseData as DiagramDataValidator,
};
