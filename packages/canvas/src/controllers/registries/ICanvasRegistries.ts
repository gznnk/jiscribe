import type { ObjectFactoryRegistry } from "@jiscribe/doc/registries/ObjectFactoryRegistry";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import type { LocaleMessages } from "../../foundation/i18n/resolveLocaleMessages";
import type { ObjectAnchorRegionRegistry } from "../../rendering/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectConnectionAnchorsRegistry } from "../../rendering/objects/registry/ObjectConnectionAnchorsRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectGeometryKeyRegistry } from "../../rendering/objects/registry/ObjectGeometryKeyRegistry";
import type { ObjectOutlineRegistry } from "../../rendering/objects/registry/ObjectOutlineRegistry";
import type { ObjectPartKindRegistry } from "../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectAutoHeightRegistry } from "../../states/registry/ObjectAutoHeightRegistry";
import type { ObjectContentResizerRegistry } from "../../states/registry/ObjectContentResizerRegistry";
import type { ObjectLayoutContainerRegistry } from "../../states/registry/ObjectLayoutContainerRegistry";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { ObjectStyleRegistry } from "../style/tables/ObjectStyleRegistry";
import type { StencilRegistry } from "../ui/objects/StencilRegistry";

/**
 * The registry contract passed as an argument to the pure reducer/handler tree
 * (commands' `execute`/`canExecute`, gesture handlers' `handle`, `handleCommand`).
 * Exported as unstable, but all its members except `command` are also members of the
 * stable `CanvasRegistries`, which extends this type, so changing one changes that
 * public type too.
 *
 * `command` is described by an **inline structural shape** rather than the concrete
 * `CommandRegistry` / `Command`, so `CommandTypes` / `GestureHandlerTypes` can
 * reference this contract without it importing them back. The real class is checked
 * against that shape where a bundle is passed as an `ICanvasRegistries`. The
 * registries living in `rendering` are imported type-only, so no runtime edge is added.
 *
 * Some members have no direct reader: they are read through slices taken structurally
 * (StyleIntentRegistries, VisualExtentRegistries), so a member nothing names is not
 * dead.
 */
export interface ICanvasRegistries {
	// --- State ---

	objectMapper: ObjectMapperRegistry;
	/**
	 * Per-type resizers deriving a box from its content. For a type whose doc stores
	 * no size or may leave `height` out, a state rebuilt from a doc gets its box here.
	 */
	objectContentResizer: ObjectContentResizerRegistry;
	/** Which types a document may leave `height` out of. */
	objectAutoHeight: ObjectAutoHeightRegistry;
	/**
	 * Which types declare themselves containers (`ObjectDocDefinition.layoutContainer`),
	 * with the title band each answers for a doc of it.
	 */
	objectLayoutContainer: ObjectLayoutContainerRegistry;

	// --- Drawing ---

	/** Per-type visual bounds: everything a shape draws, including what falls outside its geometry box. */
	objectVisualBounds: ObjectVisualBoundsRegistry;

	// --- Connections ---

	/** Per-type outline polygons: the drawn silhouette a connector end lands on. */
	objectOutline: ObjectOutlineRegistry;
	/** Per-type anchor regions: the rect a shape's edge anchors are centered on. */
	objectAnchorRegion: ObjectAnchorRegionRegistry;
	/** Per-type connection points beyond the four edge anchors (the brace's `tip`). */
	objectExtraConnectPoints: ObjectExtraConnectPointsRegistry;
	/** Per-type declarations of which anchors are offered and where their dots sit. */
	objectConnectionAnchors: ObjectConnectionAnchorsRegistry;
	/** Per-type keys the connector route cache compares an owner by besides its frame. */
	objectGeometryKey: ObjectGeometryKeyRegistry;

	// --- Interaction ---

	objectBehavior: ObjectBehaviorRegistry;
	/**
	 * Per-type sub-part definitions, keyed by `(type, kind)`: what a part selection
	 * inside an object means to the type that owns it.
	 */
	objectPartKind: ObjectPartKindRegistry;

	// --- Style ---

	/**
	 * Per-type style tables: which style intents a type takes and where each lands in
	 * its data, so writing a style and reporting it read one answer.
	 */
	objectStyle: ObjectStyleRegistry;
	/**
	 * Per-type, per-slot text-style defaults: what a field the author left unset
	 * resolves to, the value that slot of that type is drawn with rather than a
	 * type-agnostic default.
	 */
	objectTextStyleDefaults: ObjectTextStyleDefaultsRegistry;
	/**
	 * Per-type stroke / fill defaults: what a field the author left unset resolves to,
	 * the value that type is drawn with rather than a type-agnostic default.
	 */
	objectShapeStyleDefaults: ObjectShapeStyleDefaultsRegistry;

	// --- Commands / UI ---

	/** Command lookup, in the inline shape described above. */
	command: {
		get(commandId: string): CommandLike | undefined;
	};
	objectFactory: ObjectFactoryRegistry;
	stencil: StencilRegistry;
}

/** The slice of a `Command` the pure tree invokes (structural; not the `Command` type). */
type CommandLike = {
	/** Read to decide whether the command may run mid-drag (see `handleCommand`). */
	category?: "edit" | "view" | "arrange" | "selection";
	/** Read to decide whether a press from any entry defers the run (see `Command.busyLabel`). */
	busyLabel?: string | LocaleMessages<string>;
	canExecute(
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	): boolean;
	/** Optional: absent on callback-executed commands (see `Command.execute`). */
	execute?(
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	): CanvasControllerState;
};
