import { Button, ButtonMinimap } from "../../components/elements/Button";
import { ButtonDefaultData } from "../../constants/data/elements/ButtonDefaultData";
import { ButtonMenuConfig } from "../../constants/menu/elements/ButtonMenuConfig";
import { ButtonDefaultState } from "../../constants/state/elements/ButtonDefaultState";
import type { ButtonData } from "../../types/data/elements/ButtonData";
import { ButtonFeatures } from "../../types/data/elements/ButtonData";
import type { ButtonProps } from "../../types/props/elements/ButtonProps";
import type { ButtonState } from "../../types/state/elements/ButtonState";
import { createButtonState } from "../../utils/elements/button/createButtonState";
import { isButtonData } from "../../utils/elements/button/isButtonData";
import { mapButtonDataToState } from "../../utils/elements/button/mapButtonDataToState";
import { mapButtonStateToData } from "../../utils/elements/button/mapButtonStateToData";
import { calcRectangleConnectPointPosition } from "../../utils/shapes/rectangle/calcRectangleConnectPointPosition";
import type {
	DataToStateMapper,
	DiagramAtlas,
	DiagramDataValidator,
	StateToDataMapper,
} from "../DiagramAtlas";

/**
 * Button Diagram Atlas
 *
 * Complete index and registry for Button diagram-related components.
 * This atlas provides centralized access to all Button-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * Button Diagram Atlas Type Definition
 */
type ButtonAtlas = DiagramAtlas<ButtonData, ButtonState, ButtonProps>;

/**
 * Button Diagram Atlas Implementation
 */
export const ButtonAtlas: ButtonAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Button",
	features: ButtonFeatures,
	menuConfig: ButtonMenuConfig,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: ButtonDefaultData,
	defaultState: ButtonDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Button,
	minimapComponent: ButtonMinimap,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: createButtonState,
	export: undefined,
	calcConnectPointPosition: calcRectangleConnectPointPosition,
	transformItems: undefined,
	dataToState: mapButtonDataToState as DataToStateMapper,
	stateToData: mapButtonStateToData as StateToDataMapper,
	validateData: isButtonData as DiagramDataValidator,
};
