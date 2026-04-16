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
