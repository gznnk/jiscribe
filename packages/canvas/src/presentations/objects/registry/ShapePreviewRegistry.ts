import type { ShapePreviewRenderer } from "./ShapePreviewTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";

/**
 * ドラッグ描画中のプレビュー描画関数を図形型ごとに管理するレジストリ。
 * 登録は `initializeObjectRegistry()` の `registerObject()` 経由で行う。
 *
 * 登録されるのはドラッグ描画対応図形（rect / ellipse / polyline）のみ。
 */
class ShapePreviewRegistry {
	private readonly renderers = new Map<ObjectType, ShapePreviewRenderer>();

	register(type: ObjectType, renderer: ShapePreviewRenderer): void {
		this.renderers.set(type, renderer);
	}

	get(type: ObjectType): ShapePreviewRenderer | undefined {
		return this.renderers.get(type);
	}

	clear(): void {
		this.renderers.clear();
	}
}

export const shapePreviewRegistry = new ShapePreviewRegistry();
