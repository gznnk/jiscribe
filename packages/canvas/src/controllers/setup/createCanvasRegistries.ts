import type { CanvasCapabilities, CanvasRegistries } from "./CanvasRegistries";
import { initializeCommands } from "./initializeCommands";
import { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
import {
	ALL_OBJECT_DEFINITIONS,
	applyObjectDefinition,
} from "./initializeObjectRegistry";
import { initializeStyleProperties } from "./initializeStyleProperties";
import { createObjectComponentRegistry } from "../../presentations/objects/registry/ObjectComponentRegistry";
import { createObjectOutlineRegistry } from "../../presentations/objects/registry/ObjectOutlineRegistry";
import { createObjectTextRegionRegistry } from "../../presentations/objects/registry/ObjectTextRegionRegistry";
import { createObjectFactoryRegistry } from "../../schemas/registry/ObjectFactoryRegistry";
import { createObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import { createObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import { createCommandRegistry } from "../commands/CommandRegistry";
import { createGestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";
import { createObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import { createStylePropertyRegistry } from "../styleProperties/StylePropertyRegistry";
import { createSelectionControlRegistry } from "../ui/controls/SelectionControlRegistry";
import { createObjectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import { createStencilRegistry } from "../ui/objects/StencilRegistry";

/**
 * Builds a fresh, fully independent bundle of UI registries for one `<Canvas>`.
 *
 * Wiring order:
 *   1. instantiate the empty registries,
 *   2. register the object-type-independent sets (gesture handlers, system
 *      style properties) — always all,
 *   3. apply the configured object types (default: every type),
 *   4. register commands, optionally restricted by `config.commands`,
 *   5. apply `config.plugins` in declared order. A plugin object type that
 *      collides with a built-in or an earlier plugin throws (see `CanvasPlugin`).
 *
 * Passing no `config` reproduces the full set, matching the historical singleton
 * behavior (backward compatible).
 */
export const createCanvasRegistries = (
	config?: CanvasCapabilities,
): CanvasRegistries => {
	const registries: CanvasRegistries = {
		objectMapper: createObjectMapperRegistry(),
		objectStateValidator: createObjectStateValidatorRegistry(),
		objectComponent: createObjectComponentRegistry(),
		objectTextRegion: createObjectTextRegionRegistry(),
		objectOutline: createObjectOutlineRegistry(),
		objectBehavior: createObjectBehaviorRegistry(),
		selectionControl: createSelectionControlRegistry(),
		gestureHandler: createGestureHandlerRegistry(),
		command: createCommandRegistry(),
		objectMenu: createObjectMenuRegistry(),
		stencil: createStencilRegistry(),
		objectFactory: createObjectFactoryRegistry(),
		styleProperty: createStylePropertyRegistry(),
	};

	initializeGestureHandlerRegistry(registries);
	initializeStyleProperties(registries.styleProperty);

	// Tracks which object types are already claimed and by whom, so a plugin
	// colliding with a built-in or an earlier plugin throws instead of
	// silently overwriting the earlier registration.
	const typeOrigins = new Map<string, string>();

	const objectTypes =
		config?.objectTypes ?? Object.keys(ALL_OBJECT_DEFINITIONS);
	for (const type of objectTypes) {
		const definition = ALL_OBJECT_DEFINITIONS[type];
		if (definition) {
			applyObjectDefinition(registries, type, definition);
			typeOrigins.set(type, "a built-in object type");
		}
	}

	initializeCommands(registries, config?.commands);

	for (const plugin of config?.plugins ?? []) {
		for (const [type, definition] of Object.entries(plugin.objects ?? {})) {
			if (!definition) {
				continue;
			}
			const existingOrigin = typeOrigins.get(type);
			if (existingOrigin !== undefined) {
				throw new Error(
					`createCanvasRegistries: plugin "${plugin.id}" object type "${type}" conflicts with ${existingOrigin}`,
				);
			}
			applyObjectDefinition(registries, type, definition);
			typeOrigins.set(type, `plugin "${plugin.id}"`);
		}
	}

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
