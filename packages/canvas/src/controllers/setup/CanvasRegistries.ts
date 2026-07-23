import type { CanvasPlugin } from "../../plugin/CanvasPlugin";
import type { ObjectComponentRegistry } from "../../presentations/objects/registry/ObjectComponentRegistry";
import type { ObjectOutlineRegistry } from "../../presentations/objects/registry/ObjectOutlineRegistry";
import type { ObjectTextRegionRegistry } from "../../presentations/objects/registry/ObjectTextRegionRegistry";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ObjectFactoryRegistry } from "../../schemas/registry/ObjectFactoryRegistry";
import type { Camera } from "../../states/canvas/Viewport";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { ObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { GestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { StylePropertyRegistry } from "../styleProperties/StylePropertyRegistry";
import type { SelectionControlRegistry } from "../ui/controls/SelectionControlRegistry";
import type { ObjectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import type { ShapeCategoryRegistry } from "../ui/menu/ShapeLibrary/ShapeCategoryRegistry";
import type { ShapePresetRegistry } from "../ui/objects/ShapePresetRegistry";

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
 * `<Canvas>` exists). Scoped alternatives are parser-scoped, not canvas-scoped
 * (see `createCanvasParser`); the global stays as the default-config fallback.
 */
export type CanvasRegistries = {
	objectMapper: ObjectMapperRegistry;
	objectStateValidator: ObjectStateValidatorRegistry;
	objectComponent: ObjectComponentRegistry;
	objectTextRegion: ObjectTextRegionRegistry;
	objectOutline: ObjectOutlineRegistry;
	objectBehavior: ObjectBehaviorRegistry;
	selectionControl: SelectionControlRegistry;
	gestureHandler: GestureHandlerRegistry;
	command: CommandRegistry;
	objectMenu: ObjectMenuRegistry;
	shapePreset: ShapePresetRegistry;
	objectFactory: ObjectFactoryRegistry;
	styleProperty: StylePropertyRegistry;
	/**
	 * Palette categories: built-ins seeded first, then each applied definition's
	 * declared categories (first-wins). The toolbar reads it to resolve a layout
	 * entry's category.
	 */
	shapeCategories: ShapeCategoryRegistry;
};

/**
 * The capability set passed to `createCanvasRegistries`: which object types,
 * commands, and plugins a `<Canvas>` operates against.
 *
 * All fields are optional; omitting them reproduces the full built-in set.
 * Restricting `objectTypes` is the caller's contract to only pass docs whose
 * object types remain enabled — otherwise `canvasToState` throws "Mapper not
 * found" (see docs/01-design-philosophy.md principle 4).
 */
export type CanvasCapabilities = {
	/** Enabled object types. Default: all registered types. */
	objectTypes?: ObjectType[];
	/** Enabled command ids. Default: all registered commands. */
	commands?: string[];
	/**
	 * Plugins applied in declared order after the built-ins
	 * (docs/05_extensibility/canvas-plugin-design.md). A type already claimed
	 * by a built-in or an earlier plugin throws at construction time.
	 */
	plugins?: readonly CanvasPlugin[];
};

/**
 * Mount-time configuration for `<Canvas initialConfig={...}>`: the capability
 * set (`CanvasCapabilities`) plus the initial view. Read **once at mount** — the
 * configuration is part of a canvas's identity, so later changes are ignored; to
 * reconfigure, remount with a new React `key` (`<Canvas key={configId} .../>`).
 *
 * `autoFocus` is deliberately NOT here: it is a top-level `<Canvas>` prop,
 * following the React-idiomatic spelling that already signals mount-time intent.
 */
export type CanvasConfig = CanvasCapabilities & {
	/**
	 * Initial camera (pan + zoom) applied once at mount, so the first paint lands
	 * at the host's view (restore a saved view, …) instead of the doc default. To
	 * move the view after mount, use `ref.current.viewport.setViewport` — not this.
	 */
	viewport?: Camera;
};
