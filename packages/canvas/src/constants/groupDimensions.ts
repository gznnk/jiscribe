/**
 * Minimum width/height a GroupState frame may have.
 *
 * GroupState invariant: `width >= MIN_GROUP_DIMENSION && height >= MIN_GROUP_DIMENSION`.
 * A group's width/height are used as divisors when scaling its children
 * (see transformFrameByGroup), so a zero-size frame would produce NaN/Infinity
 * that propagates into child coordinates (issue #12 / #35).
 *
 * The invariant is enforced at every point where a group frame is produced:
 * - calculateGroupOrientedBounds (bounds derived from children — covers group
 *   creation, bounds updates, and file loading)
 * - createMultiSelectGroup / calcMultiSelectGroupBounds (transient multi-select group)
 * - TransformControlHandler (resize floor for group targets)
 */
export const MIN_GROUP_DIMENSION = 1;
