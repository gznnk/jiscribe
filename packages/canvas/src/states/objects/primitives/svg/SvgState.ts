import type {
	SvgExtraDoc,
	SvgFeatures,
} from "@jiscribe/doc/model/objects/primitives/svg/SvgDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SvgStateBrand: unique symbol;

export type SvgState = CreateObjectState<
	typeof SvgFeatures,
	typeof SvgStateBrand,
	SvgExtraDoc
>;
