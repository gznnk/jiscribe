import { DocumentIcon } from "./DocumentIcon";
import type { ShapePreset } from "../ShapePreset";

export const DocumentShapePresets: ShapePreset[] = [
	{
		id: "document",
		objectType: "document",
		label: { en: "Document", ja: "書類" },
		categories: { flowchart: 60 },
		icon: DocumentIcon,
	},
];
