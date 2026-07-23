import { MultiDocumentIcon } from "./MultiDocumentIcon";
import type { StencilPreset } from "../StencilPreset";

export const MultiDocumentStencilPresets: StencilPreset[] = [
	{
		id: "multiDocument",
		objectType: "multiDocument",
		label: { en: "Multi-document", ja: "複数書類" },
		icon: MultiDocumentIcon,
		categories: { flowchart: 65 },
	},
];
