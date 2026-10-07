/**
 * What a whole selection says about one property: one value every object of it
 * carries, several values it disagrees on, or no object carrying the property at
 * all.
 *
 * The sidebar states a property for the selection rather than for one object of
 * it, so a row has three things to draw and not two — a value, the "mixed"
 * marking, and the fallback it shows when nothing in the selection has the
 * property (`none`, which is also what an empty selection yields).
 *
 * @template Value - The property's own type; include `undefined` in it where
 *   "carried but unset" is a value of its own (a slot's `fontWeight`, say)
 */
export type SelectionValue<Value> =
	| { kind: "single"; value: Value }
	/**
	 * `values` are the distinct values the selection carries, at least two, in
	 * the order they first appear in the selection (compared with `Object.is`).
	 * The first of them is what a row that steps rather than states (a number
	 * field's arrows) moves from; a color row draws its swatch from them.
	 */
	| { kind: "mixed"; values: readonly Value[] }
	| { kind: "none" };

/**
 * Folds the values the selection's objects carry into what the selection says.
 * Compared with `Object.is`, so the caller resolves its values (through the
 * defaults registries, into a sentinel for unset) before handing them over.
 *
 * @param values - One entry per object that carries the property, in selection order; an empty list yields `none`
 * @returns `single` when every entry is the same value, otherwise `mixed` with each distinct entry once, in order of first appearance
 */
export const combineSelectionValues = <Value>(
	values: readonly Value[],
): SelectionValue<Value> => {
	const distinctValues: Value[] = [];
	for (const value of values) {
		if (!distinctValues.some((seen) => Object.is(seen, value))) {
			distinctValues.push(value);
		}
	}
	switch (distinctValues.length) {
		case 0:
			return { kind: "none" };
		case 1:
			return { kind: "single", value: distinctValues[0] };
		default:
			return { kind: "mixed", values: distinctValues };
	}
};

/**
 * The one value the selection agrees on, or the fallback for the three cases
 * that have none. Rows use it to keep drawing something while `isMixed` says the
 * drawn value is not what the selection is on.
 *
 * @param selectionValue - What the selection says about the property
 * @param fallback - Shown for `mixed`, for `none` and for an agreed `undefined` (the property carried but unset); usually the row's own default
 * @returns The agreed value, or `fallback`
 */
export const selectionValueOr = <Value, Fallback>(
	selectionValue: SelectionValue<Value>,
	fallback: Fallback,
): Exclude<Value, undefined> | Fallback =>
	selectionValue.kind === "single" && selectionValue.value !== undefined
		? (selectionValue.value as Exclude<Value, undefined>)
		: fallback;

/**
 * The one value the selection agrees on, once it turns out to be of the type the
 * row draws. For a kind a type declares for itself read by its name alone, which
 * comes back `unknown` — a row that holds the declaring table reads it typed
 * instead (useSelectionStyle) and needs no guard.
 *
 * @param selectionValue - What the selection says about the property
 * @param isValue - The guard the agreed value must pass; a value of another type falls back the way a disagreeing selection does, since the row has nothing to draw either way
 * @param fallback - Shown for `mixed`, for `none` and for a value the guard rejects; usually the row's own default
 * @returns The agreed value, or `fallback`
 */
export const selectionValueAs = <Value, Fallback>(
	selectionValue: SelectionValue<unknown>,
	isValue: (value: unknown) => value is Value,
	fallback: Fallback,
): Value | Fallback =>
	selectionValue.kind === "single" && isValue(selectionValue.value)
		? selectionValue.value
		: fallback;

/**
 * A value the selection really carries: the one it agrees on, or the first of
 * the several it does not. What a row hands a control that steps from the value
 * it is given — a mixed row's arrows land on `value ± 1`, so the row's own
 * constant there would step from a number nothing in the selection is near.
 *
 * @param selectionValue - What the selection says about the property
 * @param fallback - Shown for `none`, and where the value taken is `undefined` (the property carried but unset); usually the row's own default
 * @returns The agreed value, the first of the differing ones, or `fallback`
 */
export const selectionValueOrFirst = <Value, Fallback>(
	selectionValue: SelectionValue<Value>,
	fallback: Fallback,
): Exclude<Value, undefined> | Fallback =>
	selectionValueOr(
		selectionValue.kind === "mixed"
			? { kind: "single", value: selectionValue.values[0] }
			: selectionValue,
		fallback,
	);

/**
 * Whether a row should draw itself as stating no single value.
 *
 * `none` is deliberately not mixed: nothing in the selection has the property,
 * so the row shows its own default the way it always has.
 *
 * @param selectionValue - What the selection says about the property
 * @returns True only for `mixed`
 */
export const isMixedSelectionValue = (
	selectionValue: SelectionValue<unknown>,
): boolean => selectionValue.kind === "mixed";

/**
 * The distinct values of a selection that disagrees, for the rows that draw
 * them (a color swatch split between them).
 *
 * @param selectionValue - What the selection says about the property
 * @returns The `mixed` values in order of first appearance; undefined for `single` and `none`
 */
export const selectionMixedValues = <Value>(
	selectionValue: SelectionValue<Value>,
): readonly Value[] | undefined =>
	selectionValue.kind === "mixed" ? selectionValue.values : undefined;
