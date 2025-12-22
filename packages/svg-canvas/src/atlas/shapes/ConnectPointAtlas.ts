import { ConnectPoint } from "../../components/shapes/ConnectPoint";
import { ConnectPointDefaultData } from "../../constants/data/shapes/ConnectPointDefaultData";
import { ConnectPointDefaultState } from "../../constants/state/shapes/ConnectPointDefaultState";
import type { ConnectPointData } from "../../types/data/shapes/ConnectPointData";
import type { ConnectPointProps } from "../../types/props/shapes/ConnectPointProps";
import type { ConnectPointState } from "../../types/state/shapes/ConnectPointState";
import { isConnectPointData } from "../../utils/shapes/connectPoint/isConnectPointData";
import { connectPointDataToState } from "../../utils/shapes/connectPoint/mapConnectPointDataToState";
import { connectPointStateToData } from "../../utils/shapes/connectPoint/mapConnectPointStateToData";
import {
	type DataToStateMapper,
	type DiagramAtlas,
	type DiagramDataValidator,
	type StateToDataMapper,
} from "../DiagramAtlas";
import { DummyComponent, dummyImplementation } from "../DiagramAtlas";

/**
 * ConnectPoint Shape Atlas
 *
 * Complete index and registry for ConnectPoint shape-related components.
 * This atlas provides centralized access to all ConnectPoint-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * ConnectPoint Shape Atlas Type Definition
 */
type ConnectPointAtlas = DiagramAtlas<
	ConnectPointData,
	ConnectPointState,
	ConnectPointProps
>;

/**
 * ConnectPoint Shape Atlas Implementation
 */
export const ConnectPointAtlas: ConnectPointAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "ConnectPoint",
	features: {},
	menuConfig: undefined,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: ConnectPointDefaultData,
	defaultState: ConnectPointDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: ConnectPoint,
	minimapComponent: DummyComponent,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: dummyImplementation,
	export: undefined,
	calcConnectPointPosition: dummyImplementation,
	transformItems: undefined,
	dataToState: connectPointDataToState as DataToStateMapper,
	stateToData: connectPointStateToData as StateToDataMapper,
	validateData: isConnectPointData as DiagramDataValidator,
};
