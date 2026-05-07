import type { MenuSectionFactory, MenuSectionGroup } from "./ObjectMenuTypes";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";

/**
 * オブジェクト型ごとのメニューグループ定義を管理するレジストリ。
 *
 * 登録は initializeObjectRegistry.ts の registerObject() 経由で行う。
 * カスタムオブジェクトを追加する場合も registerObject() を使い、
 * ファクトリ関数でそのオブジェクト専用のグループ・セクション構成を返す。
 *
 * @example
 * registerObject("myShape", definition, (state) => [
 *   { id: "style", sections: [{ type: "backgroundColor" }] },
 *   { id: "custom", sections: [{ type: "custom", id: "myPanel", component: MyPanel }] },
 * ]);
 */
class ObjectMenuRegistry {
	private readonly factories = new Map<ObjectType, MenuSectionFactory>();

	/**
	 * オブジェクト型にメニューグループファクトリを紐づける。
	 * 同じ型を再登録すると上書きされる。
	 */
	register<TState extends ObjectState>(
		type: ObjectType,
		factory: MenuSectionFactory<TState>,
	): void {
		this.factories.set(type, factory as MenuSectionFactory);
	}

	/**
	 * 指定した型のファクトリを呼び出してメニューグループを返す。
	 * 未登録の型は空配列を返す。
	 */
	getGroups(type: ObjectType, state: ObjectState): MenuSectionGroup[] {
		return this.factories.get(type)?.(state) ?? [];
	}

	/** 全登録を削除する。initializeObjectRegistry の再実行前に呼ぶ。 */
	clear(): void {
		this.factories.clear();
	}
}

export const objectMenuRegistry = new ObjectMenuRegistry();
