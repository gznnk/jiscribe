import { CalloutIcon } from "./CalloutIcon";
import type { StencilPreset } from "../StencilPreset";

export const CalloutStencilPresets: StencilPreset[] = [
	{
		id: "callout",
		objectType: "callout",
		label: { en: "Callout", ja: "吹き出し" },
		icon: CalloutIcon,
		categories: { annotation: 10 },
	},
];
