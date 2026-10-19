import type { Dimensions, Rect } from "@jiscribe/geometry";

/**
 * Calculates the region of one text slot from the shape's state (untransformed
 * width/height plus any per-shape fields, e.g. a headerHeight (see the container
 * plugin)), in the shape's local coordinate space (origin at the center, top-left
 * based Rect). Implementations declare what they read via `TState`, a reader of
 * extra per-shape fields declaring them optional so it stays assignable where the
 * box alone is promised. A calculator reading the box alone is also a doc
 * definition's `ObjectDocTextRegionCalculator`, which is how most shipped shapes
 * declare one function for both sides.
 *
 * `slotId` is a key of `state.text` (the authority on which slots a shape has).
 * A single-slot shape can simply leave the parameter out of its signature — a
 * shorter signature stays assignable.
 *
 * A calculator sizing its region from its own text measures with
 * `DEFAULT_FONT_FAMILY` wherever the slot names no family, which is also what
 * the overlay draws it in.
 *
 * Declared as the `"textSlot"` part kind's `region`
 * (createTextSlotPartKindDefinition); registration puts the vertical basis on
 * top of its answer (placeTextSlotRegions).
 */
export type ObjectTextRegionCalculator<TState extends Dimensions = Dimensions> =
	(state: TState, slotId: string) => Rect;

/**
 * Calculates the regions of every text slot of a shape in one call, for a type
 * whose one slot cannot be placed without laying out the rest (a table's cells,
 * a record's stacked compartments). Same space and same state contract as
 * {@link ObjectTextRegionCalculator}: local coordinates, origin at the center,
 * top-left based Rects, and `TState` declaring what the calculator reads beyond
 * the box.
 *
 * The answer is keyed by slot id and must hold every key of `state.text`; a key
 * it leaves out is an invariant broken upstream and makes the registered kind
 * throw (placeTextSlotRegions). Keys beyond `state.text` are ignored.
 *
 * Declared as the `"textSlot"` part kind's `regions`
 * (createTextSlotPartKindDefinition).
 */
export type ObjectTextSlotRegionsCalculator<
	TState extends Dimensions = Dimensions,
> = (state: TState) => Readonly<Record<string, Rect>>;

/**
 * Where a type places its text slots, handed to createTextSlotPartKindDefinition:
 * at most one of the two. Neither = every slot takes the whole box.
 */
export type TextSlotRegionCalculators<TState extends Dimensions = Dimensions> =
	{
		/** Places one slot at a time; the usual declaration of a one-body type. */
		region?: ObjectTextRegionCalculator<TState>;
		/** Places every slot in one call, for slots laid out against each other (a table's cells). */
		regions?: ObjectTextSlotRegionsCalculator<TState>;
	};
