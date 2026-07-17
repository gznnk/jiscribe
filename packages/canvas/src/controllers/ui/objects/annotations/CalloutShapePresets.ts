import { CalloutIcon } from "./CalloutIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const CalloutShapePresets: ShapePreset[] = [
	{
		id: "callout",
		objectType: "callout",
		label: "Callout",
		categories: { annotation: 10 },
		icon: CalloutIcon,
	},
];
