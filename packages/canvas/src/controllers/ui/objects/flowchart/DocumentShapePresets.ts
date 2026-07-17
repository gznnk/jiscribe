import { DocumentIcon } from "./DocumentIcon";
import type { ShapePreset } from "../types/ShapePreset";

export const DocumentShapePresets: ShapePreset[] = [
	{
		id: "document",
		objectType: "document",
		label: "Document",
		categories: { flowchart: 60 },
		icon: DocumentIcon,
	},
];
