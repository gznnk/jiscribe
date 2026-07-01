/**
 * 型 T の全キーを網羅した配列だけを受け付けるビルダーを返す。
 *
 * `satisfies readonly (keyof T)[]` は「存在しないキーを混ぜない」ことしか保証せず、
 * 取りこぼした（短い）配列も通してしまう。本ヘルパーで配列を構築すると、T にフィールドを
 * 足してキー配列へ追従し忘れたときにコンパイルエラーになり、Frame 系マッパーの allow-list
 * pass-through 漏れを未然に防ぐ。戻り値はそのままキー定数として使うため、未使用判定も生じない。
 *
 * @example
 * export const STROKE_STYLE_KEYS = exhaustiveKeysOf<StrokeStyleDoc>()([
 *   "stroke",
 *   "strokeWidth",
 *   "strokeDashType",
 * ] as const);
 */
export const exhaustiveKeysOf =
	<T>() =>
	<K extends readonly (keyof T)[]>(
		keys: K & ([keyof T] extends [K[number]] ? unknown : never),
	): K =>
		keys;
