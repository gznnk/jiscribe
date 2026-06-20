import type { ObjectDoc } from "../objects/base/ObjectDoc";

export type CanvasDoc = CanvasDocV1;

export type CanvasDocAny = CanvasDocV1;

/**
 * root は z-order（背面→前面）を表す単一のトップレベル配列。
 * オブジェクトとコネクター（type === "connector"）を混在させて保持し、
 * 並び順がそのまま重なり順になる。コネクターは group の子にはならず root 直下のみ。
 */
export type CanvasDocV1 = {
	$schema?: string;
	version: 1;
	root: ObjectDoc[];
};
