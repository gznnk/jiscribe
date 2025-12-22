import { Frame } from "../../components/elements/Frame";
import { FrameDefaultData } from "../../constants/data/elements/FrameDefaultData";
import { FrameDefaultState } from "../../constants/state/elements/FrameDefaultState";
import type { FrameData } from "../../types/data/elements/FrameData";
import { FrameFeatures } from "../../types/data/elements/FrameData";
import type { FrameProps } from "../../types/props/elements/FrameProps";
import type { FrameState } from "../../types/state/elements/FrameState";
import { isFrameData } from "../../utils/elements/frame/isFrameData";
import type { DiagramAtlas, DiagramDataValidator } from "../DiagramAtlas";
import { DummyComponent, dummyImplementation } from "../DiagramAtlas";

/**
 * Frame Element Atlas
 *
 * Complete index and registry for Frame element-related components.
 * This atlas provides centralized access to all Frame-related types,
 * default values, components, and utility functions.
 *
 * This file serves both as a developer reference and as a programmatic
 * registry for the DiagramRegistry system.
 */

/**
 * Frame Element Atlas Type Definition
 */
type FrameAtlas = DiagramAtlas<FrameData, FrameState, FrameProps>;

/**
 * Frame Element Atlas Implementation
 */
export const FrameAtlas: FrameAtlas = {
	// ============================================================================
	// Types
	// ============================================================================

	type: "Frame",
	features: FrameFeatures,
	menuConfig: undefined,

	// ============================================================================
	// Defaults
	// ============================================================================

	defaultData: FrameDefaultData,
	defaultState: FrameDefaultState,

	// ============================================================================
	// Components
	// ============================================================================

	component: Frame,
	minimapComponent: DummyComponent,

	// ============================================================================
	// Utility Functions
	// ============================================================================

	createState: dummyImplementation,
	export: undefined,
	calcConnectPointPosition: dummyImplementation,
	transformItems: undefined,
	dataToState: dummyImplementation,
	stateToData: dummyImplementation,
	validateData: isFrameData as DiagramDataValidator,
};
