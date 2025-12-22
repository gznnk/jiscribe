import { Sticky, StickyMinimap } from "../../components/diagrams/Sticky";
import { StickyDefaultData } from "../../constants/data/diagrams/StickyDefaultData";
import { StickyMenuConfig } from "../../constants/menu/diagrams/StickyMenuConfig";
import { StickyDefaultState } from "../../constants/state/diagrams/StickyDefaultState";
import type { StickyData } from "../../types/data/diagrams/StickyData";
import { StickyFeatures } from "../../types/data/diagrams/StickyData";
import type { StickyProps } from "../../types/props/diagrams/StickyProps";
import type { StickyState } from "../../types/state/diagrams/StickyState";
import { createStickyState } from "../../utils/diagrams/sticky/createStickyState";
import { isStickyData } from "../../utils/diagrams/sticky/isStickyData";
import { stickyDataToState } from "../../utils/diagrams/sticky/mapStickyDataToState";
import { stickyStateToData } from "../../utils/diagrams/sticky/mapStickyStateToData";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * Sticky Atlas
 *
 * Complete index and registry for Sticky-related components.
 * This atlas provides centralized access to all Sticky-related types,
 * default values, components, and utility functions.
 */

/**
 * Sticky Atlas Type Definition
 */
type StickyAtlas = DiagramAtlas<StickyData, StickyState, StickyProps>;

/**
 * Sticky Atlas Implementation
 */
export const StickyAtlas: StickyAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Sticky",
	features: StickyFeatures,
	menuConfig: StickyMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: StickyDefaultData,
	defaultState: StickyDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Sticky,
	minimapComponent: StickyMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createStickyState,
	export: undefined, // Optional: implement if diagram can be exported
	calcConnectPointPosition: () => [], // Not connectable
	transformItems: undefined, // Optional: implement if diagram can transform child items
	dataToState: stickyDataToState as DataToStateMapper,
	stateToData: stickyStateToData as StateToDataMapper,
	validateData: isStickyData as DiagramDataValidator,
};
