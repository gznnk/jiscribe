import type { Point } from "@workspace/geometry";

import type { ObjectType } from "./ObjectType";

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
	id: ConnectPointId;
};

export type FreeAnchorSpec = {
	kind: "free";
	point: Point;
};

export type AnchorSpec =
	| CenterAnchorSpec
	| ConnectPointAnchorSpec
	| FreeAnchorSpec;

export type AnchorKind = AnchorSpec["kind"];

export type OwnerRef = {
	type: ObjectType;
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
	return typeof owner.id === "string" && typeof owner.type === "string";
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
	if (a.owner?.id !== b.owner?.id || a.owner?.type !== b.owner?.type) {
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
