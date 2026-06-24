import type { Point } from "@workspace/geometry";

import type { ObjectDoc } from "../base/ObjectDoc";

/** ゴースト表示用の図形の半サイズ（中央からのオフセット）。 */
export type ShapeDimensions = { halfWidth: number; halfHeight: number };

/**
 * 図形の「生成」に関する知識をまとめたファクトリ。
 * 図形ごとに 1 つ実装し、`shapeFactoryRegistry` に型で登録する。
 *
 * `createObjectDoc` などの switch 分岐をこのファクトリへ移すことで、
 * 各呼び出し側が全図形を知らなくても生成できるようになる。
 */
export type ShapeFactory = {
	/**
	 * 中央基準の position から ObjectDoc を生成する。
	 * クリックによる中央配置・ドラッグ&ドロップ配置で使う。
	 */
	createDoc(position: Point, overrides?: Record<string, unknown>): ObjectDoc;

	/**
	 * ゴースト表示用の半サイズ（overrides 適用後）を返す。
	 */
	calcDimensions(overrides?: Record<string, unknown>): ShapeDimensions;

	/**
	 * 2 点 bounds から ObjectDoc を生成する。最小サイズ未満は null を返す。
	 *
	 * このメソッドの「有無」が「ドラッグ描画できる図形か」を表す。
	 * 持たない図形（sticky / polygon など）はクリックで中央配置になる。
	 */
	createDocFromBounds?(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		overrides?: Record<string, unknown>,
		minSize?: number,
	): ObjectDoc | null;
};

/** overrides の数値フィールドを取り出し、有限数でなければ既定値を返す小ヘルパ。 */
export const numberOverride = (value: unknown, fallback: number): number =>
	Number.isFinite(value) ? (value as number) : fallback;
