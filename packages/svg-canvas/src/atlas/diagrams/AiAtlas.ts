import { Ai, AiMinimap } from "../../components/diagrams/Ai";
import { AiDefaultData } from "../../constants/data/diagrams/AiDefaultData";
import { AiMenuConfig } from "../../constants/menu/diagrams/AiMenuConfig";
import { AiDefaultState } from "../../constants/state/diagrams/AiDefaultState";
import type { AiData } from "../../types/data/diagrams/AiData";
import { AiFeatures } from "../../types/data/diagrams/AiData";
import type { AiProps } from "../../types/props/diagrams/AiProps";
import type { AiState } from "../../types/state/diagrams/AiState";
import { createAiState } from "../../utils/diagrams/ai/createAiState";
import { isAiData } from "../../utils/diagrams/ai/isAiData";
import { aiDataToState } from "../../utils/diagrams/ai/mapAiDataToState";
import { aiStateToData } from "../../utils/diagrams/ai/mapAiStateToData";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * Ai Atlas
 *
 * Complete index and registry for Ai-related components.
 * This atlas provides centralized access to all Ai-related types,
 * default values, components, and utility functions.
 */

/**
 * Ai Atlas Type Definition
 */
type AiAtlas = DiagramAtlas<AiData, AiState, AiProps>;

/**
 * Ai Atlas Implementation
 */
export const AiAtlas: AiAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Ai",
	features: AiFeatures,
	menuConfig: AiMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: AiDefaultData,
	defaultState: AiDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Ai,
	minimapComponent: AiMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createAiState,
	export: undefined, // Optional: implement if diagram can be exported
	calcConnectPointPosition: () => [], // Not connectable
	transformItems: undefined, // Optional: implement if diagram can transform child items
	dataToState: aiDataToState as DataToStateMapper,
	stateToData: aiStateToData as StateToDataMapper,
	validateData: isAiData as DiagramDataValidator,
};
