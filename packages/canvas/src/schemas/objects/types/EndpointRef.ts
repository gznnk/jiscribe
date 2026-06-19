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
	// center 同士（kind が一致していれば追加情報なし）
	return true;
};

/**
 * 2 つのエンドポイント参照が同値かどうかを判定する。
 * owner（接続先オブジェクト）とアンカー指定の両方が一致するときのみ true。
 */
export const isSameEndpoint = (a: EndpointRef, b: EndpointRef): boolean => {
	if (a.owner?.id !== b.owner?.id || a.owner?.type !== b.owner?.type) {
		return false;
	}
	return isSameAnchor(a.anchor, b.anchor);
};

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
