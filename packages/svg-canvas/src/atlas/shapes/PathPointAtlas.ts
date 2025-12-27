import { PathPoint, PathPointMinimap } from "../../components/shapes/PathPoint";
import { PathPointDefaultData } from "../../constants/data/shapes/PathPointDefaultData";
import { PathPointDefaultState } from "../../constants/state/shapes/PathPointDefaultState";
import type { PathPointData } from "../../types/data/shapes/PathPointData";
import type { PathPointProps } from "../../types/props/shapes/PathPointProps";
import type { PathPointState } from "../../types/state/shapes/PathPointState";
import { isPathPointData } from "../../utils/shapes/path/isPathPointData";
import { mapPathPointDataToState } from "../../utils/shapes/path/mapPathPointDataToState";
import { pathPointStateToData } from "../../utils/shapes/path/mapPathPointStateToData";
import {
	dummyImplementation,
	type DataToStateMapper,
	type DiagramAtlas,
	type DiagramDataValidator,
	type StateToDataMapper,
} from "../DiagramAtlas";

/**
 * PathPoint Shape Atlas
 *
 * Complete index and registry for PathPoint shape-related components.
 * This atlas provides centralized access to all PathPoint-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * PathPoint Shape Atlas Type Definition
 */
type PathPointAtlas = DiagramAtlas<
	PathPointData,
	PathPointState,
	PathPointProps
>;

/**
 * PathPoint Shape Atlas Implementation
 */
export const PathPointAtlas: PathPointAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "PathPoint",
	features: {},
	menuConfig: undefined,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: PathPointDefaultData,
	defaultState: PathPointDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: PathPoint,
	minimapComponent: PathPointMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: (props: { x: number; y: number }) => ({
		...PathPointDefaultState,
		x: props.x,
		y: props.y,
	}),
	export: undefined,
	calcConnectPointPosition: dummyImplementation,
	transformItems: undefined,
	dataToState: mapPathPointDataToState as DataToStateMapper,
	// TODO: 要精査
	stateToData: ((state) =>
		pathPointStateToData(state as PathPointState)) as StateToDataMapper,
	validateData: isPathPointData as DiagramDataValidator,
};
