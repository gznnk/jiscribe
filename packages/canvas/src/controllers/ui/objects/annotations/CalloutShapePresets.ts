import { CalloutIcon } from "./CalloutIcon";
import type { ShapePreset } from "../ShapePreset";

export const CalloutShapePresets: ShapePreset[] = [
	{
		id: "callout",
		objectType: "callout",
		label: { en: "Callout", ja: "吹き出し" },
		categories: { annotation: 10 },
		icon: CalloutIcon,
	},
];
