import type { TextableData } from "../../../types/data/core/TextableData";

/**
 * Default textable data template.
 * Used for State to Data conversion mapping.
 */
export const TextableDefaultData = {
	text: "",
	textType: "textarea",
	fontColor: "#000000",
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
	textAlign: "center",
	verticalAlign: "center",
} as const satisfies TextableData;
