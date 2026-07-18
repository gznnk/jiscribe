import { PolylineIcon } from "./PolylineIcon";
import type { ShapePreset } from "../ShapePreset";

export const PolylineShapePresets: ShapePreset[] = [
	{
		id: "polyline",
		objectType: "polyline",
		label: "Polyline",
		categories: { basic: 30 },
		icon: PolylineIcon,
	},
];
