import type { ObjectComponentRegistry } from "../../presentations/objects/registry/ObjectComponentRegistry";
import type { ShapePreviewRegistry } from "../../presentations/objects/registry/ShapePreviewRegistry";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ShapeFactoryRegistry } from "../../schemas/registry/ShapeFactoryRegistry";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { ObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { GestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { ShapePresetRegistry } from "../registry/ShapePresetRegistry";
import type { ObjectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";

/**
 * The full set of UI registries a single `<Canvas>` instance operates against.
 *
 * Historically these were module-level singletons shared by every canvas. The
 * bundle groups them so a canvas can own its own configured set (see
 * `createCanvasRegistries`), which is the foundation for per-canvas configuration
 * (`<Canvas config={...}>`).
 *
 * `objectDocValidatorRegistry` is intentionally NOT part of this bundle: it is
 * used only during parse-time validation at the input boundary (before a
 * `<Canvas>` exists) and stays global.
 */
export type CanvasRegistries = {
	objectMapper: ObjectMapperRegistry;
	objectStateValidator: ObjectStateValidatorRegistry;
	objectComponent: ObjectComponentRegistry;
	shapePreview: ShapePreviewRegistry;
	objectBehavior: ObjectBehaviorRegistry;
	gestureHandler: GestureHandlerRegistry;
	command: CommandRegistry;
	objectMenu: ObjectMenuRegistry;
	shapePreset: ShapePresetRegistry;
	shapeFactory: ShapeFactoryRegistry;
};

/**
 * Per-canvas configuration passed to `createCanvasRegistries`.
 *
 * All fields are optional; the defaults reproduce the full set (backward
 * compatible). Restricting `objectTypes` is the caller's contract to only pass
 * docs whose object types remain enabled — otherwise `canvasToState` throws
 * "Mapper not found" (see docs/01-design-philosophy.md principle 4).
 */
export type CanvasConfig = {
	/** Enabled object types. Default: all registered types. */
	objectTypes?: ObjectType[];
	/** Enabled command ids. Default: all registered commands. */
	commands?: string[];
	/** Escape hatch to further customize the built registries in place. */
	customize?: (registries: CanvasRegistries) => void;
};

/**
 * Augments `CanvasControllerState` with the `registries` bundle here rather than
 * in `CanvasTypes.ts`. The bundle references registries (`command`,
 * `gestureHandler`, `objectMenu`) whose handler signatures reference
 * `CanvasControllerState`, so declaring the field in `CanvasTypes` would make
 * `CanvasTypes` import this module and close a type-only file cycle (madge
 * `dep:circle`). Relocating just this one edge here keeps the module graph
 * acyclic while the types stay mutually recursive (which TypeScript handles).
 */
declare module "../CanvasTypes" {
	interface CanvasControllerState {
		/**
		 * The per-canvas UI registry bundle. Injected once at construction
		 * (`createInitialControllerState`) and carried on the state so the pure
		 * reducer/handler/util tree can resolve object mappers, commands, gesture
		 * handlers, etc. without reading module-level singletons (#165, Option B).
		 *
		 * Held by reference and never serialized: history stores `DocSnapshot`s
		 * (Docs), not controller state, so this adds no per-commit cost. All state
		 * update paths spread the previous state (`{...state}`, `resetUiState`,
		 * `SYNC_EXTERNAL`), so `registries` is preserved automatically.
		 */
		registries: CanvasRegistries;
	}
}
