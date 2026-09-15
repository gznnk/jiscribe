/**
 * Defines the geometry type of an object.
 * - 'none': No geometry (e.g., group)
 * - 'rect': Uses top-left coordinate system (x, y, width, height)
 * - 'ellipse': Uses center coordinate system (cx, cy, rx, ry)
 * - 'poly': Shape defined by points array (polyline/polygon)
 * - 'point': Doc carries a position only (x, y); the size is derived from the
 *   content and exists in the state alone. The doc coordinate is where that
 *   derived box has its top-left corner drawn — the local (-w/2, -h/2) corner
 *   with the object's rotation and flips applied — so growing content leaves
 *   the anchor, and the stored coordinate, where they were.
 */
export type GeometryType = "none" | "rect" | "ellipse" | "poly" | "point";

/**
 * Smallest value a geometry's extent may take — the `minimum` the JSON schema
 * states for a width, a height, and a radius. Read at both boundaries, which
 * name those fields differently (a doc writes `width`/`height` or `rx`/`ry`, a
 * state always `width`/`height`) yet bound them alike: `createFrameDocValidator`
 * on the doc side, `isValidFrameState` on the state side.
 */
export const GEOMETRY_SIZE_MIN = 0;
