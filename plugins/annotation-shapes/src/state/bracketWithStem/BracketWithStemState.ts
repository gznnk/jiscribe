import type { CreateObjectState } from "@jiscribe/canvas";

import type { BracketWithStemFeatures } from "../../schema/bracketWithStem/BracketWithStemDoc";
import type {
	GroupMarkerDirectionField,
	GroupMarkerTipPositionField,
} from "../../schema/shared/GroupMarkerFields";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BracketWithStemStateBrand: unique symbol;

export type BracketWithStemState = CreateObjectState<
	typeof BracketWithStemFeatures,
	typeof BracketWithStemStateBrand,
	GroupMarkerDirectionField & GroupMarkerTipPositionField
>;
