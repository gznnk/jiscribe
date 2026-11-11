/**
 * Constants for orthogonal connector routing.
 */

import { EDGE_ROUTE_MARGIN } from "@jiscribe/layout";

/**
 * Default stub length (px) by which the line is pushed out from a shape's face.
 *
 * The endpoint is pushed out along its exit direction by this distance before
 * bends are allowed, so larger values produce a longer straight segment at the
 * arrow's root. It is also reused as the clearance width when routing around a
 * shape (the box outline ± margin in `elbowCandidates`, and the ring bulge in
 * `selfLoop`). The same clearance the whole-drawing routing keeps
 * (`EDGE_ROUTE_MARGIN`, `@jiscribe/layout`).
 */
export const DEFAULT_CONNECTOR_MARGIN = EDGE_ROUTE_MARGIN;
