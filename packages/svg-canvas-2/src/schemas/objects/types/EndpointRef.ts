import type { Point } from "@workspace/geometry";

import type { ObjectType } from "./ObjectType";

export type CenterAnchorSpec = {
	kind: "center";
};

export const ConnectPointIds = [
	"center",
	"topCenter",
	"rightCenter",
	"bottomCenter",
	"leftCenter",
] as const;

export type ConnectPointId = (typeof ConnectPointIds)[number];

export const isConnectPointId = (value: unknown): value is ConnectPointId =>
	ConnectPointIds.includes(value as ConnectPointId);

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

export const isOwnedEndpointRef = (value: unknown): value is OwnedEndpointRef => {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	if (typeof v.owner !== "object" || v.owner === null) return false;
	const owner = v.owner as Record<string, unknown>;
	return typeof owner.id === "string" && typeof owner.type === "string";
};

export const isFreeEndpointRef = (value: unknown): value is FreeEndpointRef => {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	if ("owner" in v && v.owner != null) return false;
	if (typeof v.anchor !== "object" || v.anchor === null) return false;
	const anchor = v.anchor as Record<string, unknown>;
	return anchor.kind === "free";
};
