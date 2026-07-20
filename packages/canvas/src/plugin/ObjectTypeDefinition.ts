import type { FC } from "react";

import type { ObjectBehaviorEntry } from "../controllers/gestures/registry/ObjectBehaviorTypes";
import type { SelectionControlDefinition } from "../controllers/ui/controls/SelectionControlTypes";
import type { MenuSectionFactory } from "../controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
import type { ShapePreset } from "../controllers/ui/objects/ShapePreset";
import type { ShapeOutlineProvider } from "../presentations/objects/registry/ShapeOutlineRegistry";
import type { ShapePreviewRenderer } from "../presentations/objects/registry/ShapePreviewTypes";
import type { TextRegionCalculator } from "../presentations/objects/registry/TextRegionRegistry";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ExtraStylePropertyDescriptor } from "../schemas/objects/types/ExtraStyleProperty";
import type { ObjectFeatures } from "../schemas/objects/types/ObjectFeatures";
import type { ShapeFactory } from "../schemas/objects/types/ShapeFactory";
import type { ObjectMapperType } from "../states/objects/base/MapperTypes";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ObjectStateValidateFn } from "../states/registry/ObjectStateValidatorRegistry";

/**
 * Creation-related capabilities for the ShapeLibrary (shape palette).
 * Omitted for types not shown in the palette (group / connector).
 */
export type ShapeLibraryRegistration = {
	/** Factory responsible for doc creation, dimensions, and bounds generation */
	factory?: ShapeFactory;
	/** Preview rendering during drag drawing (only for shapes that support bounds drawing) */
	previewRenderer?: ShapePreviewRenderer;
	/** Presets shown in the toolbar (multiple allowed per type) */
	presets?: ShapePreset[];
};

/**
 * The full description of a single object type across every registry
 * (mapper, component, text region, behavior, state validator, menu) plus its
 * optional ShapeLibrary capabilities.
 *
 * `TDoc` / `TState` tie `mapper` / `behavior` / `menuFactory` / `selectionControls`
 * to one state type. A plugin declares a standalone definition with an explicit
 * annotation — `ObjectTypeDefinition<ContainerDoc, ContainerState>` — and needs no
 * `defineObject` call. The built-in record uses `defineObject` instead, because a
 * record literal can only be annotated with the widened entry type, which would
 * erase per-entry inference.
 */
export type ObjectTypeDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	mapper: ObjectMapperType<TDoc, TState>;

	features: ObjectFeatures;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: FC<any>;

	/** Text region calculator. Omitted = full bbox (see TextRegionRegistry). */
	textRegion?: TextRegionCalculator;

	/** Outline polygon provider. Omitted = bounding-box rect/ellipse (see ShapeOutlineRegistry). */
	outline?: ShapeOutlineProvider;

	behavior: ObjectBehaviorEntry<TState>;

	menuFactory: MenuSectionFactory<TState>;

	validateState: ObjectStateValidateFn;

	/** Type-specific selection controls (handle renderer + gesture strategy pairs). */
	selectionControls?: SelectionControlDefinition<TState>[];

	/** Styleable properties beyond the ObjectFeatures flags (see StylePropertyRegistry). */
	extraStyleProperties?: Record<string, ExtraStylePropertyDescriptor>;

	shapeLibrary?: ShapeLibraryRegistration;
};

/**
 * State-erased storage form. `any` on the state params kills the reverse
 * variance of `menuFactory` / `behavior` (contravariant in `TState`), so a
 * precisely-typed definition flows into the registry without a cast. This is the
 * type the plugin/registry boundary stores.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObjectTypeDefinition = ObjectTypeDefinition<any, any>;

/**
 * Builds a single built-in `ObjectTypeDefinition`, preserving per-type `TState`
 * inference at the definition site (mapper / behavior / menuFactory are checked
 * together) before widening to the base-typed record entry. Plugins declare
 * standalone definitions with an explicit annotation instead (see above).
 */
export const defineObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	def: ObjectTypeDefinition<TDoc, TState>,
): ObjectTypeDefinition => def as unknown as ObjectTypeDefinition;
