import type { ObjectType } from "../objects/types/ObjectType";
import type { ShapeFactory } from "../objects/types/ShapeFactory";

/**
 * 図形型ごとの `ShapeFactory` を管理するレジストリ。
 * 登録は `initializeObjectRegistry()` の `registerObject()` 経由で行う。
 *
 * 新しい図形を追加するときは、その図形フォルダに `ShapeFactory` を作って
 * `registerObject(..., { shapeFactory })` で登録するだけでよい。
 * `createObjectDoc` 等の呼び出し側は無編集で新図形に対応する。
 */
class ShapeFactoryRegistry {
	private readonly entries = new Map<ObjectType, ShapeFactory>();

	register(type: ObjectType, factory: ShapeFactory): void {
		this.entries.set(type, factory);
	}

	get(type: ObjectType): ShapeFactory | undefined {
		return this.entries.get(type);
	}

	/**
	 * ドラッグ描画（bounds 指定での生成）に対応する図形か。
	 * `createDocFromBounds` の有無で判定する。
	 */
	supportsBoundsDrawing(type: ObjectType): boolean {
		return this.entries.get(type)?.createDocFromBounds !== undefined;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const shapeFactoryRegistry = new ShapeFactoryRegistry();
