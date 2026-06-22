import type {
	SvgExtraDoc,
	SvgFeatures,
} from "../../../../schemas/objects/primitives/svg/SvgDoc";
import type { CreateObjectState } from "../../utils/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SvgStateBrand: unique symbol;

export type SvgState = CreateObjectState<
	typeof SvgFeatures,
	typeof SvgStateBrand,
	SvgExtraDoc
>;
