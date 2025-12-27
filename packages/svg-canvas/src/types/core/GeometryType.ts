/**
 * Defines the geometry type of a diagram element.
 * - 'rect': Uses top-left coordinate system (x, y, width, height)
 * - 'ellipse': Uses center coordinate system (cx, cy, rx, ry)
 * - 'point': Uses simple coordinate system (x, y)
 * - 'none': No inherent geometry (e.g. for paths defined by child points)
 */
export type GeometryType = "rect" | "ellipse" | "point" | "poly" | "none";
