import { Svg, SvgMinimap } from "../../components/shapes/Svg";
import { SvgDefaultData } from "../../constants/data/shapes/SvgDefaultData";
import { SvgMenuConfig } from "../../constants/menu/shapes/SvgMenuConfig";
import { SvgDefaultState } from "../../constants/state/shapes/SvgDefaultState";
import type { SvgData } from "../../types/data/shapes/SvgData";
import { SvgFeatures } from "../../types/data/shapes/SvgData";
import type { SvgProps } from "../../types/props/shapes/SvgProps";
import type { SvgState } from "../../types/state/shapes/SvgState";
import { createSvgState } from "../../utils/shapes/svg/createSvgState";
import { isSvgData } from "../../utils/shapes/svg/isSvgData";
import { mapSvgDataToState } from "../../utils/shapes/svg/mapSvgDataToState";
import { svgStateToData } from "../../utils/shapes/svg/mapSvgStateToData";
import { svgToBlob } from "../../utils/shapes/svg/svgToBlob";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * Svg Shape Atlas
 *
 * Complete index and registry for Svg shape-related components.
 * This atlas provides centralized access to all Svg-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * Svg Shape Atlas Type Definition
 */
type SvgAtlas = DiagramAtlas<SvgData, SvgState, SvgProps>;

/**
 * Svg Shape Atlas Implementation
 */
export const SvgAtlas: SvgAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Svg",
	features: SvgFeatures,
	menuConfig: SvgMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: SvgDefaultData,
	defaultState: SvgDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Svg,
	minimapComponent: SvgMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: (props: { x: number; y: number }) =>
		createSvgState({ ...props, svgText: "" }),
	export: svgToBlob,
	calcConnectPointPosition: () => [],
	transformItems: undefined,
	dataToState: mapSvgDataToState as DataToStateMapper,
	stateToData: svgStateToData as StateToDataMapper,
	validateData: isSvgData as DiagramDataValidator,
};
