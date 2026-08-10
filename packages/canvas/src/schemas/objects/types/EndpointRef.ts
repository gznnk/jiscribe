import type { Point } from "@jiscribe/geometry";

export type CenterAnchorSpec = {
	kind: "center";
};

export const ConnectPointIds = [
	"topCenter",
	"rightCenter",
	"bottomCenter",
	"leftCenter",
] as const;

export type ConnectPointId = (typeof ConnectPointIds)[number];

export type ConnectPointAnchorSpec = {
	kind: "connectPoint";
	/**
	 * A {@link ConnectPointId}, or an id the owner's object type declares itself
	 * (see ObjectExtraConnectPointsRegistry) — `string` because the set is open to
	 * plugins. Never `"center"`: the center is its own {@link CenterAnchorSpec}.
	 * An id no type declares resolves to the owner's center rather than failing.
	 */
	id: string;
};

export const EdgeAnchorSides = ["top", "right", "bottom", "left"] as const;

export type EdgeAnchorSide = (typeof EdgeAnchorSides)[number];

/**
 * An anchor free to sit anywhere along one edge of the owner, for the positions
 * the named anchors do not cover. Both fields describe the shape's **local**
 * space — before rotation and flips — so the anchor stays on the same piece of
 * the shape however it is turned over.
 */
export type EdgeAnchorSpec = {
	kind: "edge";
	/** Which of the owner's four local bounding-box edges the anchor rides. */
	side: EdgeAnchorSide;
	/**
	 * Position along that edge, 0..1. Measured left → right on `top`/`bottom`
	 * and top → bottom on `left`/`right`, in local space (a flip mirrors where
	 * the ratio lands rather than renumbering it). 0.5 is the edge midpoint,
	 * i.e. the same place as the matching {@link ConnectPointId}.
	 */
	t: number;
};

export type FreeAnchorSpec = {
	kind: "free";
	point: Point;
};

export type AnchorSpec =
	CenterAnchorSpec | ConnectPointAnchorSpec | EdgeAnchorSpec | FreeAnchorSpec;

export type AnchorKind = AnchorSpec["kind"];

export type OwnerRef = {
	id: string;
};

export type OwnedEndpointRef = {
	owner: OwnerRef;
	anchor: Exclude<AnchorSpec, FreeAnchorSpec>;
};

export type FreeEndpointRef = {
	owner?: never;
	anchor: FreeAnchorSpec;
};

export type EndpointRef = OwnedEndpointRef | FreeEndpointRef;

/**
 * Determines whether the given value is a ConnectPointId.
 *
 * @param value The value to test
 * @returns true if the value is a ConnectPointId, false otherwise
 */
export const isConnectPointId = (value: unknown): value is ConnectPointId =>
	ConnectPointIds.includes(value as ConnectPointId);

/**
 * Determines whether the given value is an EdgeAnchorSide.
 *
 * @param value The value to test
 * @returns true if the value is one of top / right / bottom / left, false otherwise
 */
export const isEdgeAnchorSide = (value: unknown): value is EdgeAnchorSide =>
	EdgeAnchorSides.includes(value as EdgeAnchorSide);

/** The side each built-in edge midpoint sits on the middle of. */
const edgeSideByConnectPointId: Record<ConnectPointId, EdgeAnchorSide> = {
	topCenter: "top",
	rightCenter: "right",
	bottomCenter: "bottom",
	leftCenter: "left",
};

/**
 * Restates an anchor as the edge anchor that resolves to the very same place, so
 * a rule written over edge positions still catches an anchor of another kind
 * standing on one (a self-loop keeping its two ends apart, say).
 *
 * @param anchor The anchor to restate; an edge anchor is returned as-is and a
 *   built-in edge midpoint becomes `t` 0.5 on its side
 * @returns The equivalent edge anchor, or null when the anchor holds no edge
 *   position of its own: a center, a free point, or a connectPoint id the owner's
 *   type declares (where the type, not the edge, decides the position)
 */
export const toEquivalentEdgeAnchor = (
	anchor: AnchorSpec,
): EdgeAnchorSpec | null => {
	if (anchor.kind === "edge") {
		return anchor;
	}
	if (anchor.kind === "connectPoint" && isConnectPointId(anchor.id)) {
		return { kind: "edge", side: edgeSideByConnectPointId[anchor.id], t: 0.5 };
	}
	return null;
};

/**
 * Every AnchorKind as a lookup table. Typed as a full Record so that adding a member
 * to AnchorSpec without listing it here is a compile error: a missing member would
 * make stripUnknownContent read a valid anchor as unknown and silently drop the
 * connector carrying it.
 */
const anchorKindMembers: Record<AnchorKind, true> = {
	center: true,
	connectPoint: true,
	edge: true,
	free: true,
};

/**
 * Determines whether the given value is an AnchorKind.
 *
 * Membership only: an owned endpoint still rejects "free" and a free endpoint still
 * rejects "center" (see validateEndpointRef), so a true result does not mean the kind
 * is usable in that endpoint's position.
 *
 * @param value The value to test
 * @returns true if the value is one of the AnchorSpec kinds, false otherwise
 */
export const isAnchorKind = (value: unknown): value is AnchorKind =>
	anchorKindMembers[value as AnchorKind] === true;

/**
 * Determines whether the given value is an OwnedEndpointRef.
 *
 * @param value The value to test
 * @returns true if the value is an OwnedEndpointRef, false otherwise
 */
export const isOwnedEndpointRef = (
	value: unknown,
): value is OwnedEndpointRef => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const v = value as Record<string, unknown>;
	if (typeof v.owner !== "object" || v.owner === null) {
		return false;
	}
	const owner = v.owner as Record<string, unknown>;
	return typeof owner.id === "string";
};

/**
 * Determines whether two anchor specs are equivalent.
 *
 * @param a The first anchor spec to compare
 * @param b The second anchor spec to compare
 * @returns true if they are equivalent, false otherwise
 */
const isSameAnchor = (a: AnchorSpec, b: AnchorSpec): boolean => {
	if (a.kind !== b.kind) {
		return false;
	}
	if (a.kind === "free" && b.kind === "free") {
		return a.point.x === b.point.x && a.point.y === b.point.y;
	}
	if (a.kind === "connectPoint" && b.kind === "connectPoint") {
		return a.id === b.id;
	}
	if (a.kind === "edge" && b.kind === "edge") {
		return a.side === b.side && a.t === b.t;
	}
	// Both center (no extra information once kind matches)
	return true;
};

/**
 * Determines whether two endpoint references are equivalent.
 * Returns true only when both the owner (connected object) and the anchor spec match.
 *
 * @param a The first endpoint reference to compare
 * @param b The second endpoint reference to compare
 * @returns true if they are equivalent, false otherwise
 */
export const isSameEndpoint = (a: EndpointRef, b: EndpointRef): boolean => {
	if (a.owner?.id !== b.owner?.id) {
		return false;
	}
	return isSameAnchor(a.anchor, b.anchor);
};

/**
 * Determines whether the given value is a FreeEndpointRef.
 *
 * @param value The value to test
 * @returns true if the value is a FreeEndpointRef, false otherwise
 */
export const isFreeEndpointRef = (value: unknown): value is FreeEndpointRef => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const v = value as Record<string, unknown>;
	if ("owner" in v && v.owner != null) {
		return false;
	}
	if (typeof v.anchor !== "object" || v.anchor === null) {
		return false;
	}
	const anchor = v.anchor as Record<string, unknown>;
	return anchor.kind === "free";
};
