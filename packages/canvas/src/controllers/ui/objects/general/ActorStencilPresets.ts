import { ActorIcon } from "./ActorIcon";
import type { StencilPreset } from "../StencilPreset";

export const ActorStencilPresets: StencilPreset[] = [
	{
		id: "actor",
		objectType: "actor",
		label: { en: "Actor", ja: "アクター" },
		categories: { general: 20 },
		icon: ActorIcon,
	},
];
