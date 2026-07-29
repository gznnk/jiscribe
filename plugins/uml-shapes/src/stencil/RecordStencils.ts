import type { Stencil } from "@workspace/canvas";

import { ClassIcon } from "./ClassIcon";
import { RecordIcon } from "./RecordIcon";
import {
	calcRecordListHeight,
	RECORD_HEADER_HEIGHT,
	RECORD_SLOT_STYLE_DEFAULTS,
} from "../schema/RecordDoc";

/**
 * Both presets create a `record`; they differ only in which compartments the new
 * box starts with, which is what the slot keys say (RecordDoc 参照). The class
 * preset spells `text` out in full because the override replaces the defaults'
 * `text` wholesale rather than merging into it.
 */
export const RecordStencils: Stencil[] = [
	{
		id: "entity",
		objectType: "record",
		label: { en: "Entity", ja: "エンティティ" },
		icon: RecordIcon,
	},
	{
		id: "class",
		objectType: "record",
		label: { en: "Class", ja: "クラス" },
		icon: ClassIcon,
		defaultOverrides: {
			// Three attribute rows and three operation rows under the title band.
			height: RECORD_HEADER_HEIGHT + calcRecordListHeight(3) * 2,
			text: {
				name: { text: "", ...RECORD_SLOT_STYLE_DEFAULTS },
				attributes: { text: [], ...RECORD_SLOT_STYLE_DEFAULTS },
				operations: { text: [], ...RECORD_SLOT_STYLE_DEFAULTS },
			},
		},
	},
];
