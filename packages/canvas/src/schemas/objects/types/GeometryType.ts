/**
 * Defines the geometry type of an object.
 * - 'none': No geometry (e.g., group)
 * - 'rect': Uses top-left coordinate system (x, y, width, height)
 * - 'ellipse': Uses center coordinate system (cx, cy, rx, ry)
 * - 'poly': Shape defined by points array (polyline/polygon)
 * - 'point': Doc carries a position only (x, y); the size is derived from the
 *   content and exists in the state alone. The doc coordinate is the top-left
 *   of that derived box, so growing content leaves the anchor where it was.
 */
export type GeometryType = "none" | "rect" | "ellipse" | "poly" | "point";
