import {
	ConnectLine,
	ConnectLineMinimap,
} from "../../components/shapes/ConnectLine";
import { ConnectLineDefaultData } from "../../constants/data/shapes/ConnectLineDefaultData";
import { ConnectLineMenuConfig } from "../../constants/menu/shapes/ConnectLineMenuConfig";
import { ConnectLineDefaultState } from "../../constants/state/shapes/ConnectLineDefaultState";
import type { ConnectLineData } from "../../types/data/shapes/ConnectLineData";
import { ConnectLineFeatures } from "../../types/data/shapes/ConnectLineData";
import type { ConnectLineProps } from "../../types/props/shapes/ConnectLineProps";
import type { ConnectLineState } from "../../types/state/shapes/ConnectLineState";
import { isConnectLineData } from "../../utils/shapes/connectLine/isConnectLineData";
import { mapConnectLineDataToState } from "../../utils/shapes/connectLine/mapConnectLineDataToState";
import { connectLineStateToData } from "../../utils/shapes/connectLine/mapConnectLineStateToData";
import {
	dummyImplementation,
	type DataToStateMapper,
	type DiagramAtlas,
	type DiagramDataValidator,
	type StateToDataMapper,
} from "../DiagramAtlas";

/**
 * ConnectLine Shape Atlas
 *
 * Complete index and registry for ConnectLine shape-related components.
 * This atlas provides centralized access to all ConnectLine-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * ConnectLine Shape Atlas Type Definition
 */
type ConnectLineAtlas = DiagramAtlas<
	ConnectLineData,
	ConnectLineState,
	ConnectLineProps
>;

/**
 * ConnectLine Shape Atlas Implementation
 */
export const ConnectLineAtlas: ConnectLineAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "ConnectLine",
	features: ConnectLineFeatures,
	menuConfig: ConnectLineMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: ConnectLineDefaultData,
	defaultState: ConnectLineDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: ConnectLine,
	minimapComponent: ConnectLineMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: dummyImplementation,
	export: undefined,
	calcConnectPointPosition: dummyImplementation,
	transformItems: undefined,
	dataToState: mapConnectLineDataToState as DataToStateMapper,
	stateToData: connectLineStateToData as StateToDataMapper,
	validateData: isConnectLineData as DiagramDataValidator,
};
