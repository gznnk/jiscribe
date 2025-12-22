import type {
	DataToStateMapper,
	DiagramDataValidator,
	DiagramDefinition,
	StateToDataMapper,
} from "./DiagramDefinition";
import type { DiagramType } from "../types/core/DiagramType";
import type { Frame } from "../types/core/Frame";
import type { DiagramMenuConfig } from "../types/menu/DiagramMenuConfig";
import type { Diagram } from "../types/state/core/Diagram";
import type { ConnectPointState } from "../types/state/shapes/ConnectPointState";

/**
 * Registry for managing diagram definitions.
 * This centralizes all diagram-related configurations and functions.
 */
class DiagramRegistryClass {
	private definitions = new Map<DiagramType, DiagramDefinition>();

	/**
	 * Register a diagram definition.
	 *
	 * @param definition - The diagram definition to register
	 */
	register(definition: DiagramDefinition): void {
		this.definitions.set(definition.type, definition);
	}

	/**
	 * Get a diagram definition by type.
	 *
	 * @param type - The diagram type
	 * @returns The diagram definition or undefined if not found
	 */
	getDefinition(type: DiagramType): DiagramDefinition | undefined {
		return this.definitions.get(type);
	}

	/**
	 * Get the component for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The component or undefined if not found
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getComponent(type: DiagramType): React.FC<any> | undefined {
		return this.definitions.get(type)?.component;
	}

	/**
	 * Get the minimap component for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The minimap component or undefined if not found
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getMinimapComponent(type: DiagramType): React.FC<any> | undefined {
		return this.definitions.get(type)?.minimapComponent;
	}

	/**
	 * Get the menu configuration for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The menu configuration or undefined if not found or not needed
	 */
	getMenuConfig(type: DiagramType): DiagramMenuConfig | undefined {
		return this.definitions.get(type)?.menuConfig;
	}

	/**
	 * Get the connect point calculator for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The calculator function or undefined if not found
	 */
	getConnectPointCalculator(
		type: DiagramType,
	): ((diagram: Diagram) => ConnectPointState[]) | undefined {
		return this.definitions.get(type)?.calcConnectPointPosition;
	}

	/**
	 * Get the create function for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The create function or undefined if not found
	 */
	getCreateFunction(
		type: DiagramType,
	): ((props: { x: number; y: number }) => Diagram | undefined) | undefined {
		return this.definitions.get(type)?.createState;
	}

	/**
	 * Get the export function for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The export function or undefined if not found
	 */
	getExportFunction(
		type: DiagramType,
	): (((diagram: Diagram) => Blob | undefined) | undefined) | undefined {
		return this.definitions.get(type)?.export;
	}

	/**
	 * Get the transform items function for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The transform items function or undefined if not found
	 */
	getTransformItemsFunction(
		type: DiagramType,
	):
		| (((ownerFrame: Frame, items: Diagram[]) => Diagram[]) | undefined)
		| undefined {
		return this.definitions.get(type)?.transformItems;
	}

	/**
	 * Get the state to data mapper function for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The state to data mapper function or undefined if not found
	 */
	getStateToDataMapper(type: DiagramType): StateToDataMapper | undefined {
		return this.definitions.get(type)?.stateToData;
	}

	/**
	 * Get the data to state mapper function for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The data to state mapper function or undefined if not found
	 */
	getDataToStateMapper(type: DiagramType): DataToStateMapper | undefined {
		return this.definitions.get(type)?.dataToState;
	}

	/**
	 * Get the data validator function for a diagram type.
	 *
	 * @param type - The diagram type
	 * @returns The data validator function or undefined if not found
	 */
	getDataValidator(type: DiagramType): DiagramDataValidator | undefined {
		return this.definitions.get(type)?.validateData;
	}

	/**
	 * Get all registered diagram types.
	 *
	 * @returns Array of registered diagram types
	 */
	getRegisteredTypes(): DiagramType[] {
		return Array.from(this.definitions.keys());
	}

	/**
	 * Check if a diagram type is registered.
	 *
	 * @param type - The diagram type to check
	 * @returns True if registered, false otherwise
	 */
	isRegistered(type: DiagramType): boolean {
		return this.definitions.has(type);
	}

	/**
	 * Clear all registered definitions.
	 * Mainly used for testing purposes.
	 */
	clear(): void {
		this.definitions.clear();
	}
}

/**
 * Global diagram registry instance.
 * Use this instance to register and access diagram definitions.
 */
export const DiagramRegistry = new DiagramRegistryClass();
