import { ConnectPointIds } from "@jiscribe/doc/model/objects/types/EndpointRef";

/**
 * Selectable anchor position on a shape as a single token — the geometric
 * center plus the four edge midpoints. This is the "handle" space used by the
 * connection controls: the highlight dots this UI renders and the DOM anchor
 * ids the gesture handler reads back, where "center" must be an offerable
 * choice.
 *
 * It is intentionally distinct from the persisted {@link ConnectPointId} (edge
 * midpoints only): the center is stored as a `CenterAnchorSpec`
 * (`kind: "center"`), never as `{ kind: "connectPoint", id: "center" }`.
 * Callers translate the "center" handle to a CenterAnchorSpec and the rest to
 * a ConnectPointAnchorSpec. Because it never reaches the document, it lives in
 * the controllers layer rather than in `@jiscribe/doc`.
 */
export const AnchorHandleIds = ["center", ...ConnectPointIds] as const;

export type AnchorHandleId = (typeof AnchorHandleIds)[number];

/**
 * Determines whether the given value is an AnchorHandleId (center or an edge
 * midpoint).
 *
 * @param value The value to test
 * @returns true if the value is an AnchorHandleId, false otherwise
 */
export const isAnchorHandleId = (value: unknown): value is AnchorHandleId =>
	AnchorHandleIds.includes(value as AnchorHandleId);
