import type { CreateStateType } from "./CreateStateType";
import type { SvgData, SvgFeatures } from "../../data/shapes/SvgData";

/**
 * Type for the state of the Svg component.
 */
export type SvgState = CreateStateType<SvgData, typeof SvgFeatures>;
