import type { ButtonData } from "../../../types/data/elements/ButtonData";
import { ButtonFeatures } from "../../../types/data/elements/ButtonData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default data values for Button
 */
export const ButtonDefaultData: ButtonData = CreateDefaultData<ButtonData>({
	type: "Button",
	options: ButtonFeatures,
	properties: {
		cornerRadius: 16,
		width: 88,
		height: 32,
		fill: "#000000",
		stroke: "#000000",
		strokeWidth: 1,
		strokeDashType: "solid",
		text: "Button",
		fontSize: 14,
		fontColor: "#ffffff",
		fontWeight: "normal",
		textAlign: "center",
		verticalAlign: "center",
	},
});
