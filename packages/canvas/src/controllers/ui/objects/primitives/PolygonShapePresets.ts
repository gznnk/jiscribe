import { PolygonIcon } from "./PolygonIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const PolygonShapePresets: ShapePreset[] = [
	{
		id: "polygon",
		objectType: "polygon",
		label: "Polygon",
		categories: { basic: 40 },
		icon: PolygonIcon,
	},
];
