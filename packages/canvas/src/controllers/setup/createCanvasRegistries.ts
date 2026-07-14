import type { CanvasConfig, CanvasRegistries } from "./CanvasRegistries";
import { initializeCommands } from "./initializeCommands";
import { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
import {
	ALL_OBJECT_DEFINITIONS,
	applyObjectDefinition,
} from "./initializeObjectRegistry";
import { createObjectComponentRegistry } from "../../presentations/objects/registry/ObjectComponentRegistry";
import { createShapeOutlineRegistry } from "../../presentations/objects/registry/ShapeOutlineRegistry";
import { createShapePreviewRegistry } from "../../presentations/objects/registry/ShapePreviewRegistry";
import { createTextRegionRegistry } from "../../presentations/objects/registry/TextRegionRegistry";
import { createShapeFactoryRegistry } from "../../schemas/registry/ShapeFactoryRegistry";
import { createObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import { createObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import { createCommandRegistry } from "../commands/CommandRegistry";
import { createGestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";
import { createObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import { createShapePresetRegistry } from "../registry/ShapePresetRegistry";
import { createObjectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";

/**
 * Builds a fresh, fully independent bundle of UI registries for one `<Canvas>`.
 *
 * Wiring order:
 *   1. instantiate the 12 empty registries,
 *   2. register all gesture handlers (object-type independent, always all),
 *   3. apply the configured object types (default: every type),
 *   4. register commands, optionally restricted by `config.commands`,
 *   5. run the `config.customize` escape hatch.
 *
 * Passing no `config` reproduces the full set, matching the historical singleton
 * behavior (backward compatible).
 */
export const createCanvasRegistries = (
	config?: CanvasConfig,
): CanvasRegistries => {
	const registries: CanvasRegistries = {
		objectMapper: createObjectMapperRegistry(),
		objectStateValidator: createObjectStateValidatorRegistry(),
		objectComponent: createObjectComponentRegistry(),
		textRegion: createTextRegionRegistry(),
		shapeOutline: createShapeOutlineRegistry(),
		shapePreview: createShapePreviewRegistry(),
		objectBehavior: createObjectBehaviorRegistry(),
		gestureHandler: createGestureHandlerRegistry(),
		command: createCommandRegistry(),
		objectMenu: createObjectMenuRegistry(),
		shapePreset: createShapePresetRegistry(),
		shapeFactory: createShapeFactoryRegistry(),
	};

	initializeGestureHandlerRegistry(registries);

	const objectTypes =
		config?.objectTypes ?? Object.keys(ALL_OBJECT_DEFINITIONS);
	for (const type of objectTypes) {
		const definition = ALL_OBJECT_DEFINITIONS[type];
		if (definition) {
			applyObjectDefinition(registries, type, definition);
		}
	}

	initializeCommands(registries, config?.commands);

	config?.customize?.(registries);

	return registries;
};

/**
 * The full default bundle (every object type and command).
 *
 * Exposed as a stable module-level identity so a config-less `<Canvas>` can
 * reuse it via `useMemo` without rebuilding the bundle on every render.
 */
export const defaultCanvasRegistries = createCanvasRegistries();

/**
 * Test helper: a fresh, fully-populated bundle isolated from the singletons and
 * from other tests. Thin wrapper over `createCanvasRegistries()`.
 */
export const createTestRegistries = (): CanvasRegistries =>
	createCanvasRegistries();
