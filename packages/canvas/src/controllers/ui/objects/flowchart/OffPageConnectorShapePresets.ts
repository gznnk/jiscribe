import { OffPageConnectorIcon } from "./OffPageConnectorIcon";
import type { ShapePreset } from "../ShapePreset";

export const OffPageConnectorShapePresets: ShapePreset[] = [
	{
		id: "offPageConnector",
		objectType: "offPageConnector",
		label: { en: "Off-page connector", ja: "他ページ結合子" },
		categories: { flowchart: 210 },
		icon: OffPageConnectorIcon,
	},
];
