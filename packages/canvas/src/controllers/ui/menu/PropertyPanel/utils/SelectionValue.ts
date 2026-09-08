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
	{ kind: "single"; value: Value } | { kind: "mixed" } | { kind: "none" };

/**
 * Folds the values the selection's objects carry into what the selection says.
 * Compared with `Object.is`, so the caller resolves its values (through the
 * defaults registries, into a sentinel for unset) before handing them over.
 *
 * @param values - One entry per object that carries the property, in selection order; an empty list yields `none`
 * @returns `single` when every entry is the same value, `mixed` from the first entry that differs
 */
export const combineSelectionValues = <Value>(
	values: readonly Value[],
): SelectionValue<Value> => {
	if (values.length === 0) {
		return { kind: "none" };
	}
	const first = values[0];
	return values.every((value) => Object.is(value, first))
		? { kind: "single", value: first }
		: { kind: "mixed" };
};

/**
 * The one value the selection agrees on, or the fallback for the two cases that
 * have none. Rows use it to keep drawing something while `isMixed` says the
 * drawn value is not what the selection is on.
 *
 * @param selectionValue - What the selection says about the property
 * @param fallback - Shown for both `mixed` and `none`; usually the row's own default
 * @returns The agreed value, or `fallback`
 */
export const selectionValueOr = <Value>(
	selectionValue: SelectionValue<Value>,
	fallback: Value,
): Value =>
	selectionValue.kind === "single" ? selectionValue.value : fallback;

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
