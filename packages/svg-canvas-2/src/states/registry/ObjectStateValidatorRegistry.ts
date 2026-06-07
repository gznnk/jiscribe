import type { ObjectType } from "../../schemas/objects/types/ObjectType";

/**
 * 型別の `ObjectState` 検証関数。クリップボード由来の untrusted オブジェクトを
 * 受け取り、その型として妥当かを boolean で返す（type guard 方式）。
 */
export type ObjectStateValidateFn = (value: unknown) => boolean;

/**
 * `ObjectState` の型別バリデータを登録するレジストリ。
 * スキーマ側 `ObjectDocValidatorRegistry` の state 版で、登録は
 * `initializeObjectRegistry()` の `registerObject()` 経由で行う。
 *
 * 主用途は `isClipboardData` でのクリップボードデータの厳格検証。
 */
class ObjectStateValidatorRegistry {
	private readonly entries = new Map<ObjectType, ObjectStateValidateFn>();

	register(type: ObjectType, validate: ObjectStateValidateFn): void {
		this.entries.set(type, validate);
	}

	/**
	 * 指定した型のバリデータで検証する。
	 * 未登録の型は厳格に拒否する（クリップボード検証では未知の型を信頼しない）。
	 */
	validate(type: string, value: unknown): boolean {
		const validate = this.entries.get(type as ObjectType);
		return validate ? validate(value) : false;
	}

	clear(): void {
		this.entries.clear();
	}
}

export const objectStateValidatorRegistry = new ObjectStateValidatorRegistry();
