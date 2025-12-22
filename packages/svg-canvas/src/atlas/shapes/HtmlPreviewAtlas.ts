import {
	HtmlPreview,
	HtmlPreviewMinimap,
} from "../../components/shapes/HtmlPreview";
import { HtmlPreviewDefaultData } from "../../constants/data/shapes/HtmlPreviewDefaultData";
import { HtmlPreviewMenuConfig } from "../../constants/menu/shapes/HtmlPreviewMenuConfig";
import { HtmlPreviewDefaultState } from "../../constants/state/shapes/HtmlPreviewDefaultState";
import type { HtmlPreviewData } from "../../types/data/shapes/HtmlPreviewData";
import { HtmlPreviewFeatures } from "../../types/data/shapes/HtmlPreviewData";
import type { HtmlPreviewProps } from "../../types/props/shapes/HtmlPreviewProps";
import type { HtmlPreviewState } from "../../types/state/shapes/HtmlPreviewState";
import { createHtmlPreviewState } from "../../utils/shapes/htmlPreview/createHtmlPreviewState";
import { isHtmlPreviewData } from "../../utils/shapes/htmlPreview/isHtmlPreviewData";
import { mapHtmlPreviewDataToState } from "../../utils/shapes/htmlPreview/mapHtmlPreviewDataToState";
import { mapHtmlPreviewStateToData } from "../../utils/shapes/htmlPreview/mapHtmlPreviewStateToData";
import type {
	DiagramAtlas,
	DataToStateMapper,
	StateToDataMapper,
	DiagramDataValidator,
} from "../DiagramAtlas";

/**
 * HtmlPreview Atlas
 *
 * Complete index and registry for HtmlPreview-related components.
 * This atlas provides centralized access to all HtmlPreview-related types,
 * default values, components, and utility functions.
 */

/**
 * HtmlPreview Atlas Type Definition
 */
type HtmlPreviewAtlas = DiagramAtlas<
	HtmlPreviewData,
	HtmlPreviewState,
	HtmlPreviewProps
>;

/**
 * HtmlPreview Atlas Implementation
 */
export const HtmlPreviewAtlas: HtmlPreviewAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "HtmlPreview",
	features: HtmlPreviewFeatures,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: HtmlPreviewDefaultData,
	defaultState: HtmlPreviewDefaultState,

	// ============================================================================
	// Menu Configuration
	// ============================================================================

	menuConfig: HtmlPreviewMenuConfig,

	// ============================================================================
	// Components
	// ============================================================================

	component: HtmlPreview,
	minimapComponent: HtmlPreviewMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createHtmlPreviewState,
	export: undefined,
	calcConnectPointPosition: () => [],
	transformItems: undefined,
	dataToState: mapHtmlPreviewDataToState as DataToStateMapper,
	stateToData: mapHtmlPreviewStateToData as StateToDataMapper,
	validateData: isHtmlPreviewData as DiagramDataValidator,
};
