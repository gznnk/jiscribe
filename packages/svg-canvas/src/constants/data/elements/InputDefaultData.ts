import type { InputData } from "../../../types/data/elements/InputData";
import { InputFeatures } from "../../../types/data/elements/InputData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default data values for Input
 */
export const InputDefaultData: InputData = CreateDefaultData<InputData>({
	type: "Input",
	options: InputFeatures,
	properties: {
		width: 200,
		height: 40,
		fill: "#FFFFFF",
		stroke: "#D9D9D9",
		strokeWidth: 1,
		strokeDashType: "solid",
		cornerRadius: 6,
		fontColor: "#000000",
		fontSize: 14,
		fontFamily: "Noto Sans JP",
		fontWeight: "normal",
		textAlign: "left",
		verticalAlign: "center",
	},
});
