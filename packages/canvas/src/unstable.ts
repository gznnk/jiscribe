/**
 * Implementation-detail layer of `@workspace/canvas`, exposed for plugin authors
 * (#144 tier 2: frame 系ベース実装). Unlike the stable API (`.`), this is NOT
 * covered by semver compatibility guarantees and may change without notice.
 *
 * This entry carries state / presentation / controller dependencies (react /
 * @emotion). The headless schema-side helpers a plugin's `schema/**` needs
 * (createFrameObjectFactory / createFrameDocValidator / validateOptionalNumber /
 * ObjectDocValidateFn / AUTO_COLOR / DEFAULT_FONT_FAMILY) live in `./unstable-doc`
 * so they can be imported without pulling in the UI.
 */

// Raw registry registration, downgraded from the stable layer (#144 §3): the
// declarative `CanvasPlugin.objects` is the intended path; this is the
// lower-level primitive it's built on.
export { applyObjectDefinition } from "./controllers/registries";

export { createFrameObject } from "./presentations/objects/base/createFrameObject";
export type {
	FrameShapeProps,
	FrameTextOverlayProps,
	FrameTextOverlayRenderer,
} from "./presentations/objects/base/createFrameObject";
export type { TextEditable } from "./presentations/objects/base/TextOverlay/TextOverlay";

// 本文がプレーンテキストでない図形(Markdown 等)向けの器。表示側とコア側の編集用
// textarea が同じ視覚契約(line-height / padding / 配置 / 色・フォント解決)を共有する
// ため、器は core 側に置いたまま中身だけを差し替える(createFrameObject の
// renderTextOverlay と組で使う)。
export { TextOverlayFrame } from "./presentations/objects/base/TextOverlay/TextOverlayFrame";
export type { TextOverlayFrameProps } from "./presentations/objects/base/TextOverlay/TextOverlayFrame";

// 本文はプレーンテキストのまま、スロットごとにタイポグラフィだけ差し替えたい図形
// (record のタイトル帯など)向け。renderTextOverlay から受け取った props を
// そのまま渡し、変えたいものだけ上書きする。
export { TextOverlay } from "./presentations/objects/base/TextOverlay/TextOverlay";

export { createFrameBehavior } from "./controllers/gestures/handlers/objects/base/FrameController";

export { createFrameMapper } from "./states/objects/base/FrameMapper";

export { createFrameStateValidator } from "./states/objects/utils/createFrameStateValidator";
export type { StateRecord } from "./states/objects/utils/validateStateUtils";

export { resolveAutoColor } from "./presentations/objects/utils/resolveAutoColor";
export type { AutoColorRole } from "./presentations/objects/utils/resolveAutoColor";

// Polygon/outline helpers for frame 系プラグイン図形の描画・connector 接続 outline。
export { formatPolygonPoints } from "./presentations/objects/utils/formatPolygonPoints";
export {
	centeredPolygonOutline,
	OUTLINE_CURVE_SEGMENTS,
} from "./presentations/objects/utils/outlineHelpers";

export { PRECISION } from "./constants/precision";

// ---------------------------------------------------------------------------
// Phase A: 型固有 selection control の部品(docs/05_extensibility/plugin-architecture-requirements.md §4)
// ---------------------------------------------------------------------------

export { ControlStrategy } from "./controllers/gestures/registry/ControlStrategy";

export { SelectionControlPill } from "./controllers/ui/controls/SelectionControlPill";
export { getResizeCursorForRotation } from "./controllers/ui/utils";

// ---------------------------------------------------------------------------
// ObjectMenu UI キット(docs/05_extensibility/plugin-architecture-requirements.md §4 UC1)
// ---------------------------------------------------------------------------
// `data-kind="menu"` 配下の `data-part` は ObjectMenuHandler が解決する文法:
//   - `toggle:{sectionId}`   → セクション(ドロップダウン等)の開閉
//   - `set:{property}:{value}` → 選択オブジェクトのプロパティ更新(1回で確定)
//   - `command:{commandId}`  → コマンド実行
//   - `slider:{property}`    → スライダー操作(drag=プレビュー / dragEnd=確定)
// 詳細は packages/canvas/docs/04-gesture-system.md 参照。プラグインへの推奨は
// 下記の共有部材を組み合わせるか `onPropertyUpdate` を呼ぶことで、data-part の
// 直書きは非推奨(内部実装への密結合になるため)。

export {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "./controllers/ui/menu/ObjectMenu/ObjectMenuStyled";

export { ObjectMenuDropdownPanel } from "./controllers/ui/menu/ObjectMenu/common/ObjectMenuDropdownPanel";
export { ObjectMenuColorPickerGrid } from "./controllers/ui/menu/ObjectMenu/common/ObjectMenuColorPickerGrid";
export { ObjectMenuSlider } from "./controllers/ui/menu/ObjectMenu/common/ObjectMenuSlider";

export { useSubmenuPosition } from "./controllers/ui/menu/ObjectMenu/hooks/useSubmenuPosition";
export type { SubmenuPlacement } from "./controllers/ui/menu/ObjectMenu/hooks/useSubmenuPosition";

export { getFirstSelectedWithProp } from "./controllers/ui/menu/ObjectMenu/utils/getFirstSelectedWithProp";

export { useCanvasMessages } from "./controllers/messages/CanvasMessagesContext";
export { useCanvasLocale } from "./controllers/messages/CanvasLocaleContext";
export {
	resolveLocaleMessages,
	resolveLocalizedLabel,
} from "./controllers/messages/resolveLocaleMessages";
export type { LocaleMessages } from "./controllers/messages/resolveLocaleMessages";

// `theme` は名前が汎用的すぎるため `canvasThemeCssVars` として re-export
// (値は `--jiscribe-*` CSS 変数 + ダークテーマ fallback。theme/CanvasTheme.ts 参照)。
export { theme as canvasThemeCssVars } from "./constants/theme";
