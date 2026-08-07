import type { Stencil } from "@workspace/canvas";

import { AbstractClassIcon } from "./AbstractClassIcon";
import { ClassIcon } from "./ClassIcon";
import { EnumIcon } from "./EnumIcon";
import { InterfaceIcon } from "./InterfaceIcon";
import { ObjectIcon } from "./ObjectIcon";
import { calcRecordListHeight, RECORD_BAND_HEIGHT } from "../schema/RecordDoc";

/**
 * Every preset creates a `record`; they differ only in which compartments the new
 * box starts with, which is what the slot keys say (RecordDoc 参照). Each preset
 * spells its slots out in full because the override replaces the defaults' `text`
 * wholesale rather than merging into it, and writes only the text: the typography
 * is the mapper's to fill (RECORD_SLOT_STYLE_DEFAULTS_BY_ID 参照).
 *
 * The heights sum one term per band and one per compartment: every compartment
 * carries padding of its own (calcRecordListHeight 参照), so measuring the rows
 * of two compartments in one call would count that padding once too few.
 */
export const RecordStencils: Stencil[] = [
	{
		id: "object",
		objectType: "record",
		label: { en: "Object", ja: "オブジェクト" },
		icon: ObjectIcon,
		// Title band over three attribute rows is what RECORD_DOC_DEFAULTS already
		// sizes for, so this preset needs no height of its own.
		defaultOverrides: {
			text: {
				name: { text: "Object" },
				attributes: {
					text: ["attribute = value", "attribute = value", "attribute = value"],
				},
			},
		},
	},
	{
		id: "class",
		objectType: "record",
		label: { en: "Class", ja: "クラス" },
		icon: ClassIcon,
		defaultOverrides: {
			height:
				RECORD_BAND_HEIGHT + calcRecordListHeight(1) + calcRecordListHeight(2),
			text: {
				name: { text: "Class" },
				attributes: { text: ["+ attribute: Type"] },
				operations: { text: ["+ operation(): Type", "+ operation(): Type"] },
			},
		},
	},
	{
		id: "interface",
		objectType: "record",
		label: { en: "Interface", ja: "インターフェース" },
		icon: InterfaceIcon,
		defaultOverrides: {
			height: RECORD_BAND_HEIGHT * 2 + calcRecordListHeight(2),
			text: {
				stereotype: { text: "<<interface>>" },
				name: { text: "Interface" },
				operations: { text: ["+ operation(): Type", "+ operation(): Type"] },
			},
		},
	},
	{
		id: "abstractClass",
		objectType: "record",
		label: { en: "Abstract Class", ja: "抽象クラス" },
		icon: AbstractClassIcon,
		defaultOverrides: {
			height:
				RECORD_BAND_HEIGHT * 2 +
				calcRecordListHeight(1) +
				calcRecordListHeight(2),
			text: {
				stereotype: { text: "<<abstract>>" },
				name: { text: "Abstract Class" },
				attributes: { text: ["# attribute: Type"] },
				operations: { text: ["+ operation(): Type", "+ operation(): Type"] },
			},
		},
	},
	{
		id: "enum",
		objectType: "record",
		label: { en: "Enum", ja: "列挙型" },
		icon: EnumIcon,
		defaultOverrides: {
			height: RECORD_BAND_HEIGHT * 2 + calcRecordListHeight(3),
			text: {
				stereotype: { text: "<<enum>>" },
				name: { text: "Enum" },
				attributes: { text: ["VALUE", "VALUE", "VALUE"] },
			},
		},
	},
];
