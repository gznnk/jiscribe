import { PolygonIcon } from "./PolygonIcon";
import type { ShapePreset } from "../ShapePreset";

export const PolygonShapePresets: ShapePreset[] = [
	{
		id: "polygon",
		objectType: "polygon",
		label: { en: "Polygon", ja: "多角形" },
		categories: { basic: 40 },
		icon: PolygonIcon,
	},
];
