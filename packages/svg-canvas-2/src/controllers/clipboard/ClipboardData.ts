import type { Point } from "@workspace/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";

export type ClipboardData = {
	__type: "jiscribe-canvas-clipboard";
	version: 1;
	objects: Record<string, ObjectState>;
	rootIds: string[];
	connectorIds: string[];
	center: Point;
};

export const isClipboardData = (value: unknown): value is ClipboardData =>
	typeof value === "object" &&
	value !== null &&
	(value as ClipboardData).__type === "jiscribe-canvas-clipboard" &&
	(value as ClipboardData).version === 1;
