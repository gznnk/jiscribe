import { ActorIcon } from "./ActorIcon";
import type { StencilPreset } from "../StencilPreset";

export const ActorStencilPresets: StencilPreset[] = [
	{
		id: "actor",
		objectType: "actor",
		label: { en: "Actor", ja: "アクター" },
		icon: ActorIcon,
		categories: { general: 20 },
	},
];
