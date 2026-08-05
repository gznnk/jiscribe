/**
 * The paper colors a sticky can take: pastels, so handwriting-weight text stays
 * readable on them. Deliberately not the general `PRESET_COLORS` grid — the
 * saturated swatches there read as a highlighted box rather than paper.
 *
 * Every `name` is also a key of the canvas `colorNames` message dictionary, so
 * the swatch titles localize without this plugin shipping its own strings.
 */
export type StickyColorPreset = {
	value: string;
	name: string;
};

export const STICKY_PRESET_COLORS: StickyColorPreset[] = [
	// Row 1
	{ value: "#fef9c3", name: "Yellow" },
	{ value: "#fed7aa", name: "Orange" },
	{ value: "#fca5a5", name: "Red" },
	{ value: "#fbcfe8", name: "Pink" },
	{ value: "#e9d5ff", name: "Purple" },

	// Row 2
	{ value: "#bfdbfe", name: "Blue" },
	{ value: "#a5f3fc", name: "Cyan" },
	{ value: "#bbf7d0", name: "Green" },
	{ value: "#fde68a", name: "Amber" },
	{ value: "#f3f4f6", name: "Gray" },
];
