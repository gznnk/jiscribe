import { MultiDocumentIcon } from "./MultiDocumentIcon";
import type { ShapePreset } from "../ShapePreset";

export const MultiDocumentShapePresets: ShapePreset[] = [
	{
		id: "multiDocument",
		objectType: "multiDocument",
		label: { en: "Multi-document", ja: "複数書類" },
		categories: { flowchart: 65 },
		icon: MultiDocumentIcon,
	},
];
