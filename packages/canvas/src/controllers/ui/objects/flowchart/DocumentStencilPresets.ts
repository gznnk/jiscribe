import { DocumentIcon } from "./DocumentIcon";
import type { StencilPreset } from "../StencilPreset";

export const DocumentStencilPresets: StencilPreset[] = [
	{
		id: "document",
		objectType: "document",
		label: { en: "Document", ja: "書類" },
		icon: DocumentIcon,
		categories: { flowchart: 60 },
	},
];
