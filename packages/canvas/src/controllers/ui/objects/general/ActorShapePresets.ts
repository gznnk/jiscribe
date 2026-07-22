import { ActorIcon } from "./ActorIcon";
import type { ShapePreset } from "../ShapePreset";

export const ActorShapePresets: ShapePreset[] = [
	{
		id: "actor",
		objectType: "actor",
		label: { en: "Actor", ja: "アクター" },
		categories: { general: 20 },
		icon: ActorIcon,
	},
];
