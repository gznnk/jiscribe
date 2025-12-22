import { Path, PathMinimap } from "../../components/shapes/Path";
import { PathDefaultData } from "../../constants/data/shapes/PathDefaultData";
import { PathMenuConfig } from "../../constants/menu/shapes/PathMenuConfig";
import { PathDefaultState } from "../../constants/state/shapes/PathDefaultState";
import type { PathData } from "../../types/data/shapes/PathData";
import { PathFeatures } from "../../types/data/shapes/PathData";
import type { PathProps } from "../../types/props/shapes/PathProps";
import type { PathState } from "../../types/state/shapes/PathState";
import { createPathState } from "../../utils/shapes/path/createPathState";
import { isPathData } from "../../utils/shapes/path/isPathData";
import { mapPathDataToState } from "../../utils/shapes/path/mapPathDataToState";
import { pathStateToData } from "../../utils/shapes/path/mapPathStateToData";
import {
	dummyImplementation,
	type DataToStateMapper,
	type DiagramAtlas,
	type DiagramDataValidator,
	type StateToDataMapper,
} from "../DiagramAtlas";

/**
 * Path Shape Atlas
 *
 * Complete index and registry for Path shape-related components.
 * This atlas provides centralized access to all Path-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * Path Shape Atlas Type Definition
 */
type PathAtlas = DiagramAtlas<PathData, PathState, PathProps>;

/**
 * Path Shape Atlas Implementation
 */
export const PathAtlas: PathAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Path",
	features: PathFeatures,
	menuConfig: PathMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: PathDefaultData,
	defaultState: PathDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Path,
	minimapComponent: PathMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createPathState,
	export: undefined,
	calcConnectPointPosition: dummyImplementation,
	transformItems: undefined,
	dataToState: mapPathDataToState as DataToStateMapper,
	stateToData: pathStateToData as StateToDataMapper,
	validateData: isPathData as DiagramDataValidator,
};
