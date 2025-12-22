import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { SvgFeatures } from "../../data/shapes/SvgData";
import type { SvgState } from "../../state/shapes/SvgState";

/**
 * Props for the Svg component.
 */
export type SvgProps = CreateDiagramProps<SvgState, typeof SvgFeatures>;
