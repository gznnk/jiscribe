import { ActorIcon } from "./ActorIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const ActorShapePresets: ShapePreset[] = [
	{
		id: "actor",
		objectType: "actor",
		label: "Actor",
		categories: { general: 20 },
		icon: ActorIcon,
	},
];
