import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";

export type ShapePreset = {
	id: string;
	objectType: ObjectType;
	label: string;
	defaultOverrides?: Record<string, unknown>;
};

export const SHAPE_PRESETS: ShapePreset[] = [
	{ id: "rect", objectType: "rect", label: "Rectangle" },
	{ id: "ellipse", objectType: "ellipse", label: "Ellipse" },
	{ id: "sticky", objectType: "sticky", label: "Sticky" },
	{
		id: "rect-markdown",
		objectType: "rect",
		label: "Markdown",
		defaultOverrides: {
			width: 300,
			height: 200,
			textType: "markdown",
			textAlign: "left",
			verticalAlign: "start",
			fill: "#ffffff",
			stroke: "#d1d5db",
			strokeWidth: 1,
			fontColor: "#374151",
			text: "# Heading\n\nBody text. **Bold** · *Italic* · `Code`\n\n- Item 1\n- Item 2",
		},
	},
];

const PRESET_MAP = new Map(SHAPE_PRESETS.map((p) => [p.id, p]));

export const getShapePreset = (id: string): ShapePreset | undefined =>
	PRESET_MAP.get(id);
