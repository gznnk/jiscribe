import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { AUTO_COLOR } from "../../../../schemas/objects/utils/autoColor";

export type ShapePreset = {
	id: string;
	objectType: ObjectType;
	label: string;
	defaultOverrides?: Record<string, unknown>;
};

export const SHAPE_PRESETS: ShapePreset[] = [
	{ id: "rect", objectType: "rect", label: "Rectangle" },
	{ id: "ellipse", objectType: "ellipse", label: "Ellipse" },
	{ id: "polyline", objectType: "polyline", label: "Polyline" },
	{ id: "polygon", objectType: "polygon", label: "Polygon" },
	{
		id: "sticky",
		objectType: "sticky",
		label: "Sticky",
		defaultOverrides: {
			width: 200,
			height: 150,
			textAlign: "left",
			verticalAlign: "top",
		},
	},
	{
		id: "rect-markdown",
		objectType: "rect",
		label: "Markdown",
		defaultOverrides: {
			width: 300,
			height: 200,
			textType: "markdown",
			textAlign: "left",
			verticalAlign: "top",
			fill: AUTO_COLOR,
			stroke: AUTO_COLOR,
			strokeWidth: 1,
			fontColor: AUTO_COLOR,
			text: "# Title\n\nWrite **markdown** here.",
		},
	},
];

const PRESET_MAP = new Map(SHAPE_PRESETS.map((p) => [p.id, p]));

export const getShapePreset = (id: string): ShapePreset | undefined =>
	PRESET_MAP.get(id);
