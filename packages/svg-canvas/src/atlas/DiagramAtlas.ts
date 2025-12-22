/**
 * Common type definitions for Diagram Atlas system
 * Structured type system used by each diagram's Atlas files
 */
import type { DiagramFeatures } from "../types/core/DiagramFeatures";
import type { DiagramType } from "../types/core/DiagramType";
import type { Frame } from "../types/core/Frame";
import type { DiagramData } from "../types/data/core/DiagramData";
import type { DiagramMenuConfig } from "../types/menu/DiagramMenuConfig";
import type { Diagram } from "../types/state/core/Diagram";
import type { ConnectPointState } from "../types/state/shapes/ConnectPointState";

export type {
	DataToStateMapper,
	DiagramDataValidator,
	StateToDataMapper,
} from "../registry/DiagramDefinition";

/**
 * Base structure type for Diagram Atlas
 *
 * @template TData - Data type
 * @template TState - State type
 * @template TProps - Props type
 */
export type DiagramAtlas<
	TData extends DiagramData,
	TState extends Diagram,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TProps = any,
> = {
	// ============================================================================
	// Types
	// ============================================================================

	/** Type identifier */
	type: DiagramType;

	/** Data Types (Serialization) */
	features: DiagramFeatures;

	/** Menu Configuration */
	menuConfig?: DiagramMenuConfig;

	// ============================================================================
	// Defaults
	// ============================================================================

	/** Default Data */
	defaultData: TData;

	/** Default State */
	defaultState: TState;

	// ============================================================================
	// Components
	// ============================================================================

	/** Component */
	component: React.FC<TProps>;

	/** Minimap Component */
	minimapComponent: React.FC<TProps>;

	// ============================================================================
	// Utility Functions
	// ============================================================================

	/** Create Functions */
	createState: (props: { x: number; y: number }) => Diagram;

	/** Transform Child Items Functions */
	transformItems?: (ownerFrame: Frame, items: Diagram[]) => Diagram[];

	/** Calculator Functions */
	calcConnectPointPosition: (state: Diagram) => ConnectPointState[];

	/** Export Function */
	export?: (state: Diagram) => Blob | undefined;

	/** Mapper Functions */
	dataToState: (data: DiagramData) => Diagram;
	stateToData: (state: Diagram) => DiagramData;

	/** Validation Function (returns true if valid, false otherwise) */
	validateData?: (data: unknown) => boolean;
};

/**
 * Dummy implementation for unsupported functions
 */
export const dummyImplementation = () => {
	throw new Error("Not supported");
};

/**
 * Dummy implementation for unsupported components
 */
export const DummyComponent = () => {
	throw new Error("Not supported");
};
