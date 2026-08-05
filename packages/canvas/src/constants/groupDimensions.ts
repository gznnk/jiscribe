/**
 * Floor for a GroupState frame's width/height, enforced wherever a group frame is
 * produced (calculateGroupOrientedBounds / createMultiSelectGroup /
 * calcMultiSelectGroupBounds / TransformControlHandler). A group's width/height
 * divide child coordinates when scaling (see transformFrameByGroup), so a
 * zero-size frame would propagate NaN/Infinity into children (#12 / #35).
 */
export const MIN_GROUP_DIMENSION = 1;
