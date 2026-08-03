import type { CreateObjectState } from "@workspace/canvas";

import type { BraceFeatures } from "../../schema/brace/BraceDoc";
import type {
	GroupMarkerDirectionField,
	GroupMarkerTipPositionField,
} from "../../schema/shared/GroupMarkerFields";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BraceStateBrand: unique symbol;

export type BraceState = CreateObjectState<
	typeof BraceFeatures,
	typeof BraceStateBrand,
	GroupMarkerDirectionField & GroupMarkerTipPositionField
>;
