import type { StrokableData } from "../../data/core/StrokableData";

/**
 * State type for elements that can have a stroke.
 * Since StrokableData has no non-persistent keys, this directly extends the data type.
 */
export type StrokableState = StrokableData;
