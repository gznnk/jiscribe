import type { FC } from "react";

import type { ObjectBehaviorEntry } from "../controllers/gestures/registry/ObjectBehaviorTypes";
import type { SelectionControlDefinition } from "../controllers/ui/controls/SelectionControlTypes";
import type { ObjectMenuSection } from "../controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
import type { Stencil } from "../controllers/ui/objects/Stencil";
import type { ObjectOutlineCalculator } from "../presentations/objects/registry/ObjectOutlineRegistry";
import type { ObjectTextRegionCalculator } from "../presentations/objects/registry/ObjectTextRegionRegistry";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ExtraStylePropertyDescriptor } from "../schemas/objects/types/ExtraStyleProperty";
import type { ObjectFactory } from "../schemas/objects/types/ObjectFactory";
import type { ObjectFeatures } from "../schemas/objects/types/ObjectFeatures";
import type { ObjectMapperType } from "../states/objects/base/MapperTypes";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ObjectStateValidator } from "../states/registry/ObjectStateValidatorRegistry";

/**
 * The full description of a single object type, aggregating one entry from each
 * layer's contract (model / render / interaction / style / editor UI). Fields are
 * grouped in that order below; required first within each group.
 *
 * `TDoc` / `TState` tie `mapper` / `behavior` / `selectionControls` to one state
 * type. A plugin declares a standalone definition with an explicit
 * annotation — `ObjectTypeDefinition<ContainerDoc, ContainerState>` — and needs no
 * `defineObject` call. The built-in record uses `defineObject` instead, because a
 * record literal can only be annotated with the widened entry type, which would
 * erase per-entry inference.
 */
export type ObjectTypeDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	// --- Model (state / schema) ---

	/** Geometry kind and per-type capability flags (see ObjectFeatures). */
	features: ObjectFeatures;

	/** Doc ↔ State conversion. */
	mapper: ObjectMapperType<TDoc, TState>;

	/** Type-guard that rejects untrusted State entering the canvas from outside (e.g. pasted clipboard data). */
	stateValidator: ObjectStateValidator;

	/** Doc creation, dimensions, and bounds generation. Required for any type with `stencils`. */
	factory?: ObjectFactory;

	// --- Render (presentation) ---

	/** SVG renderer for the shape. Editable types read `isEditing` by self-declaring `FC<TState & TextEditable>`. */
	component: FC<TState>;

	/** Editable-text region. Omitted = full bbox (see ObjectTextRegionRegistry). */
	textRegion?: ObjectTextRegionCalculator;

	/** Hit-test / snap outline. Omitted = bounding-box rect/ellipse (see ObjectOutlineRegistry). */
	outline?: ObjectOutlineCalculator;

	// --- Interaction (controllers) ---

	/** Group-transform ops (move / rotate / transform). */
	behavior: ObjectBehaviorEntry<TState>;

	/** Type-specific selection controls (handle renderer + gesture strategy pairs). */
	selectionControls?: SelectionControlDefinition<TState>[];

	// --- Style ---

	/** Styleable properties beyond the ObjectFeatures flags (see StylePropertyRegistry). */
	extraStyleProperties?: Record<string, ExtraStylePropertyDescriptor>;

	// --- Editor UI (StencilLibrary / ObjectMenu) ---

	/**
	 * Stencils this type contributes to the palette (multiple allowed per type).
	 * Registration only makes them exist; where they show and in what order is
	 * decided by `toolbar.layout` (a pinned entry, or a category entry's `presetIds`).
	 */
	stencils?: Stencil[];

	/**
	 * ObjectMenu sections for this type. Omitted = derived from features (see createDefaultMenu).
	 * Static per type; per-instance visibility belongs to the `custom` item component
	 * (return null and the emptied section collapses).
	 */
	menu?: ObjectMenuSection[];
};

/**
 * State-erased storage form. `any` on the state params kills the reverse
 * variance of `behavior` (contravariant in `TState`), so a precisely-typed
 * definition flows into the registry without a cast. This is the type the
 * plugin/registry boundary stores.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObjectTypeDefinition = ObjectTypeDefinition<any, any>;

/**
 * Builds a single built-in `ObjectTypeDefinition`, preserving per-type `TState`
 * inference at the definition site (mapper / behavior are checked together) before widening to the base-typed record entry. Plugins declare
 * standalone definitions with an explicit annotation instead (see above).
 */
export const defineObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	def: ObjectTypeDefinition<TDoc, TState>,
): ObjectTypeDefinition => def as unknown as ObjectTypeDefinition;
