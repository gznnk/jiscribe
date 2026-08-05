import type { CreateObjectState } from "@workspace/canvas";

import type { BracketFeatures } from "../../schema/bracket/BracketDoc";
import type { GroupMarkerDirectionField } from "../../schema/shared/GroupMarkerFields";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BracketStateBrand: unique symbol;

export type BracketState = CreateObjectState<
	typeof BracketFeatures,
	typeof BracketStateBrand,
	GroupMarkerDirectionField
>;
