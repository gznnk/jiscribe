import { SubroutineIcon } from "./SubroutineIcon";
import type { StencilPreset } from "../StencilPreset";

export const SubroutineStencilPresets: StencilPreset[] = [
	{
		id: "subroutine",
		objectType: "subroutine",
		label: { en: "Subroutine", ja: "サブルーチン" },
		categories: { flowchart: 35 },
		icon: SubroutineIcon,
	},
];
