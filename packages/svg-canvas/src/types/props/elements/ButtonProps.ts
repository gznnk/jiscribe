import type { Optional } from "@workspace/utility-types";

import type { ButtonFeatures } from "../../data/elements/ButtonData";
import type { ButtonState } from "../../state/elements/ButtonState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for Button component
 */
export type ButtonProps = Optional<
	CreateDiagramProps<ButtonState, typeof ButtonFeatures>,
	| "cornerRadius"
	| "fill"
	| "stroke"
	| "strokeWidth"
	| "connectPoints"
	| "fontSize"
	| "fontColor"
	| "fontWeight"
	| "fontFamily"
	| "textAlign"
	| "verticalAlign"
	| "textType"
> & {
	effectsEnabled?: boolean;
};
