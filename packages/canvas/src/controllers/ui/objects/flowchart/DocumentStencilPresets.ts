import { DocumentIcon } from "./DocumentIcon";
import type { StencilPreset } from "../StencilPreset";

export const DocumentStencilPresets: StencilPreset[] = [
	{
		id: "document",
		objectType: "document",
		label: { en: "Document", ja: "書類" },
		categories: { flowchart: 60 },
		icon: DocumentIcon,
	},
];
