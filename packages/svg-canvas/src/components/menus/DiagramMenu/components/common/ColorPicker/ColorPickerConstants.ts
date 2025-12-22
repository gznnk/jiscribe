/**
 * Color preset item with value and display name
 */
export type ColorPreset = {
	value: string;
	name: string;
};

/**
 * Preset colors based on Tailwind CSS color palette
 * 28 carefully selected colors in 4x7 grid
 */
export const PRESET_COLORS: ColorPreset[] = [
	// Row 1: Reds, Pinks & Purples
	{ value: "#dc2626", name: "Red" },
	{ value: "#f87171", name: "Light Red" },
	{ value: "#ec4899", name: "Pink" },
	{ value: "#f472b6", name: "Light Pink" },
	{ value: "#e879f9", name: "Fuchsia" },
	{ value: "#9333ea", name: "Purple" },
	{ value: "#a855f7", name: "Light Purple" },

	// Row 2: Violets, Indigos & Blues
	{ value: "#8b5cf6", name: "Violet" },
	{ value: "#a78bfa", name: "Light Violet" },
	{ value: "#6366f1", name: "Indigo" },
	{ value: "#3b82f6", name: "Blue" },
	{ value: "#60a5fa", name: "Light Blue" },
	{ value: "#0ea5e9", name: "Sky" },
	{ value: "#38bdf8", name: "Light Sky" },

	// Row 3: Cyans, Teals, Greens & Limes
	{ value: "#06b6d4", name: "Cyan" },
	{ value: "#22d3ee", name: "Light Cyan" },
	{ value: "#14b8a6", name: "Teal" },
	{ value: "#10b981", name: "Emerald" },
	{ value: "#22c55e", name: "Green" },
	{ value: "#84cc16", name: "Lime" },
	{ value: "#a3e635", name: "Light Lime" },

	// Row 4: Yellows, Ambers, Oranges & Neutrals
	{ value: "#eab308", name: "Yellow" },
	{ value: "#f59e0b", name: "Amber" },
	{ value: "#f97316", name: "Orange" },
	{ value: "#000000", name: "Black" },
	{ value: "#6b7280", name: "Gray" },
	{ value: "#ffffff", name: "White" },
	{ value: "transparent", name: "Transparent" },
];
