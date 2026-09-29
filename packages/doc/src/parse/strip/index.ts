// Public face of the strip stage. The files behind it (stripObjectNode /
// stripUnknownEnumValues / stripUnknownViewFields / findUnknownAnchorKind /
// collectRemovedIds) are imported directly from tests, but only this module is what
// the parser reaches for.
export { stripUnknownContent } from "./stripUnknownContent";
export type { StripUnknownContentResult } from "./stripUnknownContent";
