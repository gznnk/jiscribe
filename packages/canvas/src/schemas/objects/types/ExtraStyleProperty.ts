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
};
