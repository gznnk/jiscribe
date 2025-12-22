import type { Optional } from "@workspace/utility-types";

import type { InputFeatures } from "../../data/elements/InputData";
import type { InputState } from "../../state/elements/InputState";
import type { CreateDiagramProps } from "../shapes/CreateDiagramProps";

/**
 * Props for Input component
 */
export type InputProps = Optional<
	CreateDiagramProps<InputState, typeof InputFeatures>,
	| "fill"
	| "stroke"
	| "strokeWidth"
	| "cornerRadius"
	| "connectPoints"
	| "fontColor"
	| "fontSize"
	| "fontFamily"
	| "fontWeight"
	| "textAlign"
	| "verticalAlign"
>;
