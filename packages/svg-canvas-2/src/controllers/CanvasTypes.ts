import type { FrameKeyPoints, Point } from "@workspace/geometry";

import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectType } from "../schemas/objects/types/ObjectType";
import type { CanvasState } from "../states/canvas/CanvasState";
import type { Viewport } from "../states/canvas/Viewport";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ConnectorState } from "../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../states/objects/primitives/group/GroupState";

// ---------------------------------------------------------------------------
// Snap types (controller-layer only)
// ---------------------------------------------------------------------------

export type SnapEdge = "left" | "right" | "top" | "bottom";

/**
 * スナップ候補点。
 * x候補: left/right エッジ。coordinate はX座標、perpendicularMin/Max はそのオブジェクトのtop/bottom。
 * y候補: top/bottom エッジ。coordinate はY座標、perpendicularMin/Max はそのオブジェクトのleft/right。
 */
export type SnapCandidate = {
	objectId: string;
	coordinate: number;
	edge: SnapEdge;
	/** ガイド線の垂直方向範囲（開始）*/
	perpendicularMin: number;
	/** ガイド線の垂直方向範囲（終了）*/
	perpendicularMax: number;
};

export type SnapCandidates = {
	/** left/right エッジ候補（coordinate 昇順ソート済み）*/
	x: SnapCandidate[];
	/** top/bottom エッジ候補（coordinate 昇順ソート済み）*/
	y: SnapCandidate[];
};

export type SnapAxisFeedback = {
	/** スナップ座標（ガイド線の位置）*/
	coordinate: number;
	/** ガイド線の垂直方向開始（x-snap: Y座標、y-snap: X座標）*/
	lineStart: number;
	/** ガイド線の垂直方向終了 */
	lineEnd: number;
	sourceObjectIds: string[];
};

export type SnapFeedback = {
	/** X軸スナップ（縦ガイド線）。left/right が各々候補と一致した場合に複数になる */
	x: SnapAxisFeedback[];
	/** Y軸スナップ（横ガイド線）。top/bottom が各々候補と一致した場合に複数になる */
	y: SnapAxisFeedback[];
};

/**
 * 履歴スタックの状態
 */
export type HistoryState = {
	/** 過去の状態（Undoスタック） */
	past: CanvasDoc[];
	/** 現在の状態 */
	present: CanvasDoc;
	/** 未来の状態（Redoスタック） */
	future: CanvasDoc[];
};

/**
 * ジェスチャー開始時（dragStart）のスナップショット。
 * ドラッグ中の計算に必要なデータを事前計算・キャッシュする専用型。
 * dragStart で生成され、dragEnd で null にクリアされる。
 */
export type EventStartSnapshot = {
	/** ドラッグ開始時のオブジェクトマップ */
	objects: Record<string, ObjectState>;
	/** オブジェクト ID → FrameKeyPoints の事前計算済みキャッシュ（multiSelectGroup.id も含む）*/
	keyPointsCache: Record<string, FrameKeyPoints>;
	/** スナップ候補（dragStart 時に事前計算）*/
	snapCandidates: SnapCandidates;
	/** ドラッグ開始時の選択 ID 一覧 */
	selectedIds: string[];
	/** 選択オブジェクト＋全子孫の ID セット（dragStart 時に事前計算）*/
	selectedIdsWithDescendants: ReadonlySet<string>;
	/** 複数選択グループ（null の場合は複数選択なし）*/
	multiSelectGroup: GroupState | null;
	/** ドラッグ開始時の viewport（grab scroll の基準点）*/
	viewport: Viewport;
};

/**
 * Canvas state extended with history management for the controller layer
 * This combines the pure canvas state with undo/redo history
 */
export type CanvasControllerState = CanvasState & {
	history: HistoryState;

	/**
	 * Currently selected object IDs.
	 */
	selectedIds: string[];

	/**
	 * Snapshot of canvas state at the start of a gesture (dragStart).
	 * Pre-computed data (keyPoints, snap candidates, etc.) is stored here
	 * and cleared on dragEnd. null when no gesture is in progress.
	 */
	eventStartSnapshot: EventStartSnapshot | null;

	/**
	 * Whether edge scrolling is enabled when dragging near canvas edges.
	 */
	edgeScrollEnabled: boolean;

	/**
	 * Timestamp of the last committable event (e.g., dragEnd).
	 * Derived from event.timeStamp. Parent components can watch this to detect when to persist state.
	 */
	lastCommitTime: number;

	/**
	 * Context menu position (client coordinates).
	 * Null when no context menu should be displayed.
	 */
	contextMenuPosition: { clientX: number; clientY: number } | null;

	/**
	 * メニューからドラッグ中の図形タイプ。
	 * dragStart で設定し、dragEnd で読み取って図形を追加した後に null にクリアする。
	 */
	pendingShapeType: ObjectType | null;

	/**
	 * ドラッグゴースト表示用の現在位置（SVG座標）。
	 * pendingShapeType と組み合わせて、ドラッグ中の図形プレビューを描画する。
	 * dragEnd で null にクリアする。
	 */
	ghostPosition: Point | null;

	/**
	 * ドラッグゴーストの図形サイズ（半幅・半高さ、SVG座標）。
	 * 全図形タイプが中央基準配置のため half サイズで保持する。
	 * dragStart で計算・キャッシュし、dragEnd で null にクリアする。
	 */
	ghostShapeDimensions: { halfWidth: number; halfHeight: number } | null;

	/**
	 * 範囲選択中の矩形（SVG座標）。
	 * Canvas上で左ドラッグ時に設定され、dragEnd / Escape で null にクリアする。
	 */
	areaSelection: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null;

	/**
	 * ObjectMenu 内で現在展開中のセクション ID。
	 * null なら全セクション閉じた状態。
	 */
	objectMenuOpenId: string | null;

	/**
	 * 複数選択されたオブジェクトがグループ化されている場合の、グループ状態。
	 * multiSelectGroup が null でない場合、selectedIds 内のオブジェクトは全てこのグループの子として扱われる。
	 * グループ化された選択状態を管理するために使用される。
	 * グループ化されていない場合は null。
	 */
	multiSelectGroup: GroupState | null;

	/**
	 * テキスト編集中の状態。
	 * null の場合はテキスト編集していない。
	 */
	textEditState: {
		objectId: string;
		text: string;
	} | null;

	/**
	 * コネクター作成中の一時的な状態。
	 * connection-anchor からドラッグ中に設定され、dragEnd で確定または破棄される。
	 */
	pendingConnector: ConnectorState | null;

	/**
	 * 現在選択中のコネクターID。
	 * selectedIds（図形専用）とは独立して管理し、相互排他を保証する。
	 * null の場合はコネクターが選択されていない。
	 */
	selectedConnectorId: string | null;

	/**
	 * 編集中のコネクターID。
	 * エンドポイントをドラッグ編集している場合に設定され、pendingConnector と組み合わせて使用される。
	 * 新規作成時は null、編集時は元のコネクターIDが設定される。
	 * dragEnd で null にクリアする。
	 */
	editingConnectorId: string | null;

	/**
	 * pendingConnector のうち、現在編集中（ドラッグ中）のエンドポイント。
	 * 新規作成時は "target"（source は固定、target を動かす）。
	 * 編集時は "source" または "target"（ドラッグしているハンドル側）。
	 * これにより、UI層で固定側のオブジェクトにのみアンカーを表示できる。
	 * dragEnd で null にクリアする。
	 */
	editingEndpoint: "source" | "target" | null;

	/**
	 * ドラッグ中のスナップフィードバック。
	 * スナップしている間のみ non-null。dragEnd でクリアする。
	 */
	snapFeedback: SnapFeedback | null;

	/**
	 * 現在アクティブな描画ツール。
	 * ShapeLibrary の Rect/Ellipse ボタンをクリックすると設定され、
	 * 描画完了・Escape・キャンバスクリック時に null にクリアされる。
	 */
	activeDrawingTool: ObjectType | null;

	/**
	 * 描画モード中のプレビュー矩形（SVG座標）。
	 * dragStart で開始点を設定し、drag で終点を更新、dragEnd で null にクリアする。
	 */
	drawingPreview: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
	} | null;
};
