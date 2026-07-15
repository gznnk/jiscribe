import type { ObjectComponentRegistry } from "../../presentations/objects/registry/ObjectComponentRegistry";
import type { ShapeOutlineRegistry } from "../../presentations/objects/registry/ShapeOutlineRegistry";
import type { ShapePreviewRegistry } from "../../presentations/objects/registry/ShapePreviewRegistry";
import type { TextRegionRegistry } from "../../presentations/objects/registry/TextRegionRegistry";
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
 * (`<Canvas initialConfig={...}>`).
 *
 * `objectDocValidatorRegistry` is intentionally NOT part of this bundle: it is
 * used only during parse-time validation at the input boundary (before a
 * `<Canvas>` exists) and stays global.
 */
export type CanvasRegistries = {
	objectMapper: ObjectMapperRegistry;
	objectStateValidator: ObjectStateValidatorRegistry;
	objectComponent: ObjectComponentRegistry;
	textRegion: TextRegionRegistry;
	shapeOutline: ShapeOutlineRegistry;
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
