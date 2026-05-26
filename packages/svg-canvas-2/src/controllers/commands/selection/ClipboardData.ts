import { isArray, isObject, isString } from "@workspace/basic-validators";
import type { Point } from "@workspace/geometry";
import { isPoint } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

export type ClipboardData = {
	__type: "jiscribe-canvas-clipboard";
	version: 1;
	objects: Record<string, ObjectState>;
	rootIds: string[];
	connectorIds: string[];
	center: Point;
};

export const isClipboardData = (value: unknown): value is ClipboardData => {
	if (!isObject(value)) return false;
	const v = value as Record<string, unknown>;

	if (v.__type !== "jiscribe-canvas-clipboard") return false;
	if (v.version !== 1) return false;
	if (!isPoint(v.center)) return false;
	if (!isArray(v.rootIds) || !(v.rootIds as unknown[]).every(isString)) return false;
	if (!isArray(v.connectorIds) || !(v.connectorIds as unknown[]).every(isString)) return false;

	if (!isObject(v.objects)) return false;
	const objects = v.objects as Record<string, unknown>;
	for (const obj of Object.values(objects)) {
		if (!isObject(obj)) return false;
		const o = obj as Record<string, unknown>;
		if (!isString(o.id) || (o.id as string).length === 0) return false;
		if (!isString(o.type)) return false;
		if (o.type === "group" && !(isArray(o.childIds) && (o.childIds as unknown[]).every(isString))) return false;
		if (o.type === "connector" && (!isObject(o.source) || !isObject(o.target))) return false;
	}

	const objectKeys = new Set(Object.keys(objects));
	if (!(v.rootIds as string[]).every((id) => objectKeys.has(id))) return false;
	if (!(v.connectorIds as string[]).every((id) => objectKeys.has(id))) return false;

	return true;
};
