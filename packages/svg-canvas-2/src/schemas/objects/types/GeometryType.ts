/**
 * Defines the geometry type of an object.
 * - 'none': No geometry (e.g., group)
 * - 'rect': Uses top-left coordinate system (x, y, width, height)
 * - 'ellipse': Uses center coordinate system (cx, cy, rx, ry)
 * - 'poly': Shape defined by points array (polyline/polygon)
 */
export type GeometryType = "none" | "rect" | "ellipse" | "poly";
