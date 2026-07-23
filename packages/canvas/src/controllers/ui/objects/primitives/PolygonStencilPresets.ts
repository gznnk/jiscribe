import { PolygonIcon } from "./PolygonIcon";
import type { StencilPreset } from "../StencilPreset";

export const PolygonStencilPresets: StencilPreset[] = [
	{
		id: "polygon",
		objectType: "polygon",
		label: { en: "Polygon", ja: "多角形" },
		categories: { basic: 40 },
		icon: PolygonIcon,
	},
];
