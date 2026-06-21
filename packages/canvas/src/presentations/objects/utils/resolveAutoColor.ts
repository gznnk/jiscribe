import { theme } from "../../../constants/theme";
import { AUTO_COLOR } from "../../../schemas/objects/utils/autoColor";

/**
 * auto（テーマ追従）色の描画時解決。
 *
 * 色フィールドはロール（役割）ごとに従うべきテーマ色が異なる:
 *
 * - `ink`     … stroke / fontColor。地に対して見える「インク」＝テーマ前景。
 * - `surface` … fill。図形の「面」＝テーマのパネル面（surface）。
 *
 * 単一ルール: **`"auto"` はロールのテーマトークンへ解決し、結果は CSS（style / emotion）
 * で当てる**。解決先（`var(--vscode-*)`）は SVG presentation 属性では解決されないため、
 * 属性ではなく CSS に渡すこと。これにより色の解決・適用方法が全フィールドで一貫する
 * （`currentColor` や `ContentGroup` 経由の暗黙解決には依存しない。issue #38 / doc 08）。
 */
export type AutoColorRole = "ink" | "surface";

/** auto を解決した先のテーマトークン。 */
const ROLE_TOKEN: Record<AutoColorRole, string> = {
	ink: theme.foreground,
	surface: theme.surface,
};

/** 値が未指定（undefined）のときのロール別フォールバック。 */
const ROLE_FALLBACK: Record<AutoColorRole, string> = {
	ink: theme.foreground,
	surface: "transparent",
};

/**
 * 色の値を描画用 CSS 値へ解決する。
 *
 * - `"auto"` → ロールのテーマトークン（ink: 前景 / surface: サーフェス）
 * - 具体色 → そのまま
 * - 未指定 → `fallback`、無ければロール既定（ink: 前景 / surface: transparent）
 */
export const resolveAutoColor = (
	value: string | undefined,
	role: AutoColorRole,
	fallback?: string,
): string =>
	value === AUTO_COLOR
		? ROLE_TOKEN[role]
		: (value ?? fallback ?? ROLE_FALLBACK[role]);
