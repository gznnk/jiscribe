/**
 * Smallest admissible value for a paint opacity (`fillOpacity` / `strokeOpacity`)
 * — fully transparent, and the `minimum` the JSON schema states for both.
 */
export const OPACITY_MIN = 0;

/**
 * Largest admissible value for a paint opacity (`fillOpacity` / `strokeOpacity`)
 * — fully opaque, and the `maximum` the JSON schema states for both. Kept here
 * rather than in either style group because both boundaries that check the
 * fields (validateDocUtils, validateStateUtils) hold the two to one range.
 */
export const OPACITY_MAX = 1;
