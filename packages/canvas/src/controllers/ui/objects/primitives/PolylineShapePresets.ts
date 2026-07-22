import { PolylineIcon } from "./PolylineIcon";
import type { ShapePreset } from "../ShapePreset";

export const PolylineShapePresets: ShapePreset[] = [
	{
		id: "polyline",
		objectType: "polyline",
		label: { en: "Polyline", ja: "折れ線" },
		categories: { basic: 30 },
		icon: PolylineIcon,
	},
];
