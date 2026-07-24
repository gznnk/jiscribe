import { DiamondIcon } from "./DiamondIcon";
import type { Stencil } from "../Stencil";

export const DiamondStencils: Stencil[] = [
	{
		id: "diamond",
		objectType: "diamond",
		// Labelled "Decision" for its flowchart role; the type stays the generic
		// geometric `diamond` (it only ever appears in the flowchart category).
		label: { en: "Decision", ja: "判断" },
		icon: DiamondIcon,
	},
];
