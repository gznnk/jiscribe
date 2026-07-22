/**
 * Implementation-detail layer of `@workspace/canvas`, exposed for plugin authors
 * (#144 tier 2: frame 系ベース実装). Unlike the stable API (`.`), this is NOT
 * covered by semver compatibility guarantees and may change without notice.
 */

// Raw registry registration, downgraded from the stable layer (#144 §3): the
// declarative `CanvasPlugin.objects` is the intended path; this is the
// lower-level primitive it's built on.
export { applyObjectDefinition } from "./controllers/setup";

export { createFrameObject } from "./presentations/objects/base/createFrameObject";
export type { FrameShapeProps } from "./presentations/objects/base/createFrameObject";
export type { TextEditable } from "./presentations/objects/base/TextOverlay/TextOverlay";

export { createFrameBehavior } from "./controllers/gestures/handlers/objects/base/FrameController";

export { createFrameMapper } from "./states/objects/base/FrameMapper";

export { createFrameShapeFactory } from "./schemas/objects/utils/createFrameShapeFactory";

export { createFrameStateValidator } from "./states/objects/utils/createFrameStateValidator";
export type { StateRecord } from "./states/objects/utils/validateStateUtils";

export { createFrameDocValidator } from "./schemas/objects/utils/createFrameDocValidator";
export { validateOptionalNumber } from "./schemas/objects/utils/validateDocUtils";
export type { ObjectDocValidateFn } from "./schemas/registry/ObjectDocValidatorRegistry";

export { resolveAutoColor } from "./presentations/objects/utils/resolveAutoColor";
export type { AutoColorRole } from "./presentations/objects/utils/resolveAutoColor";

export { AUTO_COLOR } from "./schemas/objects/utils/autoColor";

export { DEFAULT_FONT_FAMILY } from "./constants/defaultFontFamily";

export { PRECISION } from "./constants/precision";

// ---------------------------------------------------------------------------
// Phase A: 型固有 selection control の基底(docs/05_extensibility/custom-controls-design.md)
// ---------------------------------------------------------------------------

export { SelectionControlHandler } from "./controllers/gestures/registry/SelectionControlHandler";
export { ControlStrategy } from "./controllers/gestures/registry/ControlStrategy";

export { SelectionControlPill } from "./controllers/ui/controls/SelectionControlPill";
export { getResizeCursorForRotation } from "./controllers/ui/utils";

export { createCowObjects } from "./controllers/utils/cowObjects";

export type { CanvasEvent } from "./controllers/gestures/registry/GestureHandlerTypes";
export type { CanvasControllerState } from "./controllers/CanvasTypes";
export type { ICanvasRegistries } from "./controllers/setup/ICanvasRegistries";

// ---------------------------------------------------------------------------
// ObjectMenu UI キット(docs/05_extensibility/custom-menu-design.md)
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
