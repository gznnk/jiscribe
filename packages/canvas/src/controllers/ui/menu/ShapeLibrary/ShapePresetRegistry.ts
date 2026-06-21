import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";

/**
 * ShapeLibrary（ツールバー）に並ぶ図形プリセットを管理するレジストリ。
 * 登録は `initializeObjectRegistry()` の `registerObject()` 経由で行う。
 *
 * - `all()` は登録順を保持して返す（= ツールバーの表示順）。
 * - プリセットは図形型と 1:N（例: rect は "rect" と "rect-markdown" を持つ）。
 */
class ShapePresetRegistry {
	private readonly ordered: ShapePreset[] = [];
	private readonly byId = new Map<string, ShapePreset>();

	register(preset: ShapePreset): void {
		this.ordered.push(preset);
		this.byId.set(preset.id, preset);
	}

	/**
	 * 表示順に並べたプリセット一覧。
	 * `order` 昇順、同値・未指定は登録順を保つ（Array.prototype.sort は安定）。
	 */
	all(): readonly ShapePreset[] {
		return [...this.ordered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}

	get(id: string): ShapePreset | undefined {
		return this.byId.get(id);
	}

	clear(): void {
		this.ordered.length = 0;
		this.byId.clear();
	}
}

export const shapePresetRegistry = new ShapePresetRegistry();

/** プリセット ID からプリセットを取得する。未登録なら undefined。 */
export const getShapePreset = (id: string): ShapePreset | undefined =>
	shapePresetRegistry.get(id);
