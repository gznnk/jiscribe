/** Coercion type for a styleable property value arriving as a string from the menu UI. */
export type StyleValueType = "string" | "number" | "boolean";

/**
 * Declaration of a shape-specific styleable property that is not covered by an
 * ObjectFeatures flag (e.g. container's `headerFill`, connector's `label.*`).
 * Declared next to the shape's Doc; the declaration's existence is the gate.
 * Dots in the property name are interpreted as a nested write path.
 */
export type ExtraStylePropertyDescriptor = {
	valueType: StyleValueType;
	/**
	 * Name of the field the value is written to on each of the object's **text
	 * slots**, instead of at the property's own dot path on the object. Omitted
	 * stores it on the object, which is what every property without a slot of its
	 * own does.
	 *
	 * For a field a slot-bearing type loads onto a slot of its own — a table
	 * cell's background (see TextSlots) — where the property needs a name apart
	 * from the field's, property names being canvas-wide and the plain ones
	 * (`fill`) already spoken for by the system handlers.
	 *
	 * The write lands on the slots the selection addresses: the ones picked one
	 * level below the object, else every slot of it — the same targets the
	 * built-in text styling takes (TextSlotStyleProperty). A `"string"` property
	 * written empty **drops the field** rather than storing `""`, so that a menu
	 * can offer "none" at all: for a color, a field absent and a field holding a
	 * value that happens to draw nothing are not the same thing.
	 */
	textSlotField?: string;
};
