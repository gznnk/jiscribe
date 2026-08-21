import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { ObjectFactoryRegistry } from "@jiscribe/doc/plugin/ObjectFactoryRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";

import type { CanvasPlugin } from "../../plugin/CanvasPlugin";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectComponentRegistry } from "../../rendering/objects/registry/ObjectComponentRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectSvgDefsRegistry } from "../../rendering/objects/registry/ObjectSvgDefsRegistry";
import type { ObjectTextRegionRegistry } from "../../rendering/objects/registry/ObjectTextRegionRegistry";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { Camera } from "../../states/canvas/Viewport";
import type { ObjectContentResizerRegistry } from "../../states/registry/ObjectContentResizerRegistry";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { ObjectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
import type { ScrollBoundsConfig } from "../CanvasTypes";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { GestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { StylePropertyRegistry } from "../styleProperties/StylePropertyRegistry";
import type { ObjectTransformHandlesRegistry } from "../ui/controls/ObjectTransformHandlesRegistry";
import type { SelectionControlRegistry } from "../ui/controls/SelectionControlRegistry";
import type { ObjectTextEditOverflowRegistry } from "../ui/editors/ObjectTextEditOverflowRegistry";
import type { ObjectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import type { StencilRegistry } from "../ui/objects/StencilRegistry";

/**
 * The full set of UI registries a single `<Canvas>` instance operates against.
 *
 * Historically these were module-level singletons shared by every canvas. The
 * bundle groups them so a canvas can own its own configured set (see
 * `createCanvasRegistries`), which is the foundation for per-canvas configuration
 * (`<Canvas initialConfig={...}>`).
 *
 * The doc validators are intentionally NOT part of this bundle: they are used only
 * during parse-time validation at the input boundary (before a `<Canvas>` exists),
 * so their registry is parser-scoped rather than canvas-scoped and is built by
 * `createCanvasParser`.
 */
export type CanvasRegistries = {
	objectMapper: ObjectMapperRegistry;
	objectStateValidator: ObjectStateValidatorRegistry;
	objectContentResizer: ObjectContentResizerRegistry;
	objectComponent: ObjectComponentRegistry;
	objectTextRegion: ObjectTextRegionRegistry;
	/**
	 * Per-type, per-slot text-style defaults, read by every side that draws,
	 * edits, measures or reports a text style so a field the author left unset
	 * resolves to what that slot of that type is drawn with rather than a
	 * type-agnostic default.
	 */
	objectTextStyleDefaults: ObjectTextStyleDefaultsRegistry;
	objectTextEditOverflow: ObjectTextEditOverflowRegistry;
	objectOutline: ObjectOutlineRegistry;
	objectAnchorRegion: ObjectAnchorRegionRegistry;
	objectExtraConnectPoints: ObjectExtraConnectPointsRegistry;
	objectGeometryKey: ObjectGeometryKeyRegistry;
	objectVisualBounds: ObjectVisualBoundsRegistry;
	objectSvgDefs: ObjectSvgDefsRegistry;
	objectBehavior: ObjectBehaviorRegistry;
	objectTransformHandles: ObjectTransformHandlesRegistry;
	selectionControl: SelectionControlRegistry;
	gestureHandler: GestureHandlerRegistry;
	command: CommandRegistry;
	objectMenu: ObjectMenuRegistry;
	stencil: StencilRegistry;
	objectFactory: ObjectFactoryRegistry;
	styleProperty: StylePropertyRegistry;
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
	 * (packages/canvas/docs/12-plugin-architecture.md). A type already claimed
	 * by a built-in or an earlier plugin throws at construction time.
	 */
	plugins?: readonly CanvasPlugin[];
};

/**
 * Mount-time configuration for `<Canvas initialConfig={...}>`: the capability
 * set (`CanvasCapabilities`) plus the view setup — where the camera starts and
 * how far it may be scrolled. Read **once at mount** — the
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
	/**
	 * Limits how far the canvas can be scrolled ({@link ScrollBoundsConfig}).
	 * Omit for the infinite canvas; `{ mode: "content" }` keeps the view over the
	 * area the objects occupy, growing and shrinking with them.
	 *
	 * The limit applies to the deliberate view scrolls — the wheel, the
	 * middle-/right-button grab pan and the one-finger touch pan — and to nothing
	 * else. Zooming, a camera set through `ref.current.viewport` (or `viewport`
	 * above), a container resize, and the scroll a drag carries with it (the wheel
	 * turned mid-drag, a drag held at the container edge) all move the view freely,
	 * outside the range included. A view left outside is never yanked back: it can
	 * only be scrolled back toward the range, never further away.
	 */
	scrollBounds?: ScrollBoundsConfig;
};
