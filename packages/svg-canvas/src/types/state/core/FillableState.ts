import type { FillableData } from "../../data/core/FillableData";

/**
 * State type for elements that can have a fill color.
 * Since FillableData has no non-persistent keys, this directly extends the data type.
 */
export type FillableState = FillableData;
