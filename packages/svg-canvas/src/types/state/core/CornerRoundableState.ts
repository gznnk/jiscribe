import type { CornerRoundableData } from "../../data/core/CornerRoundableData";

/**
 * State type for elements that can have corner radius.
 * Since CornerRoundableData has no non-persistent keys, this directly extends the data type.
 */
export type CornerRoundableState = CornerRoundableData;
