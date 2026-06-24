import type { FrameKeyPoints, Point } from "@workspace/geometry";

import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ShapePreset } from "../schemas/objects/types/ShapePreset";
import type { CanvasState } from "../states/canvas/CanvasState";
import type { Viewport } from "../states/canvas/Viewport";
import type { ClipboardData } from "./commands/selection/ClipboardData";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ConnectorState } from "../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../states/objects/primitives/group/GroupState";

// ---------------------------------------------------------------------------
// History coalescing types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

/**
 * 連続操作を 1 つの undo エントリにまとめるための集約状態。
 * recorded は履歴層が、pending は各イベントハンドラが責務を持つ（役割で分離）。
 */
export type HistoryCoalesce = {
	/**
	 * 直前コミットの集約識別子（key とコミット時刻）。
	 * recordHistoryIfNeeded のみが書き、ハンドラからは read-only。
	 * null は集約境界（次のコミットは必ず新規エントリになる）。
	 */
	recorded: { key: string; time: number } | null;
	/**
	 * 各ハンドラが「集約したい時だけ」セットする集約キー（intent）。
	 * recordHistoryIfNeeded がコミット時に消費し、必ず null に戻す。
	 * 何を同じ操作の連続とみなすかをキーに織り込む（例: "move:<選択ID>"）。
	 */
	pending: string | null;
};

// ---------------------------------------------------------------------------
// KeyPoints cache types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

export type KeyPointsCacheEntry = {
	stateRef: ObjectState;
	keyPoints: FrameKeyPoints;
};

/** オブジェクトID → keyPoints のキャッシュ。CanvasControllerState に保持し、handleGesture で更新する。 */
export type KeyPointsCache = Record<string, KeyPointsCacheEntry>;

// ---------------------------------------------------------------------------
// Snap types (controller-layer only)
// ---------------------------------------------------------------------------

export type SnapEdge =
	| "left"
	| "right"
	| "top"
	| "bottom"
	| "hCenter"
	| "vCenter";

/**
 * スナップ候補点。
 * x候補: left/right エッジ + hCenter（中央のX座標）。coordinate はX座標、perpendicularMin/Max はそのオブジェクトのtop/bottom。
 * y候補: top/bottom エッジ + vCenter（中央のY座標）。coordinate はY座標、perpendicularMin/Max はそのオブジェクトのleft/right。
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
 * Shift ドラッグの軸固定フィードバック。
 * ビューポート全体に伸びるガイド線を表す（SnapFeedback と同じく x=縦線 / y=横線）。
 * 通常はどちらか一方のみ。原点スナップ中は両方を設定して十字に表示する。
 */
export type AxisLockFeedback = {
	/** 縦ガイド線の X 座標（SVG 座標）。X 固定（縦移動）または原点スナップ時に設定 */
	x?: number;
	/** 横ガイド線の Y 座標（SVG 座標）。Y 固定（横移動）または原点スナップ時に設定 */
	y?: number;
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
	/** オブジェクト ID → FrameKeyPoints の断面（multiSelectGroup.id も含む）*/
	keyPoints: Record<string, FrameKeyPoints>;
	/** スナップ候補（dragStart 時に事前計算・全オブジェクト分。除外は findSnap に Set で渡す）*/
	snapCandidates: SnapCandidates;
	/** ドラッグ開始時の選択 ID 一覧 */
	selectedIds: string[];
	/**
	 * 選択オブジェクト＋全子孫の ID セット（dragStart 時に事前計算）。
	 * スナップの除外集合として findSnap / buildSnapFeedback に渡す。
	 */
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
	 * keyPoints の永続キャッシュ。dragStart のたびに参照比較で差分のみ再計算する。
	 * CanvasDoc には含まれず、履歴管理の対象外。
	 */
	keyPointsCache: KeyPointsCache;

	/**
	 * snapCandidates のキャッシュ。keyPointsCache が変化した dragStart のみ再計算する。
	 * null の場合は未計算（次の dragStart で必ず計算される）。
	 */
	snapCandidatesCache: SnapCandidates | null;

	/**
	 * Whether edge scrolling is enabled when dragging near canvas edges.
	 */
	edgeScrollEnabled: boolean;

	/**
	 * Incremented when a new edit is confirmed (dragEnd, command execution, etc.).
	 * Internal signal used exclusively by recordHistoryIfNeeded to trigger history recording.
	 */
	commitVersion: number;

	/**
	 * Incremented when a file save is required.
	 * Set by recordHistoryIfNeeded (on normal commits) and Undo/Redo.
	 * Monitored by the single useEffect in Canvas.tsx.
	 */
	saveVersion: number;

	/**
	 * UUID generated each time saveVersion increments.
	 * Passed to onCommit and echoed back via SYNC_EXTERNAL to identify fold-back saves.
	 */
	saveNonce: string;

	/**
	 * 履歴エントリの集約（連続したナッジ＝矢印キー移動などを 1 つの undo にまとめる）に使う状態。
	 * CanvasDoc には含めない transient な内部シグナル。
	 */
	historyCoalesce: HistoryCoalesce;

	/**
	 * Context menu position (client coordinates).
	 * Null when no context menu should be displayed.
	 */
	contextMenuPosition: { clientX: number; clientY: number } | null;

	/**
	 * ShapeLibrary からのドラッグ中状態。
	 * dragStart で設定し、dragEnd で図形を追加後に null にクリアする。
	 * null でない間はドラッグ進行中を意味する。
	 */
	shapeLibraryDrag: {
		/** ドラッグ中の図形プリセット */
		preset: ShapePreset;
		/** ゴースト表示位置（SVG座標・スナップ済み）*/
		ghostPosition: Point;
		/** ゴースト図形の半サイズ（dragStart 時にキャッシュ）*/
		shapeDimensions: { halfWidth: number; halfHeight: number };
	} | null;

	/**
	 * 描画モード中の状態。
	 * ShapeLibrary の Rect/Ellipse ボタンをクリックすると設定され、
	 * 描画完了・Escape・キャンバスクリック時に null にクリアされる。
	 * - null: 描画モード OFF
	 * - preview が null: 描画モード ON（ドラッグ未開始）
	 * - preview が non-null: ドラッグ中（プレビュー表示中）
	 */
	shapeDrawing: {
		/** 描画中の図形プリセット */
		preset: ShapePreset;
		/** ドラッグ中のプレビュー矩形（SVG座標）。ドラッグ開始前は null */
		preview: {
			startX: number;
			startY: number;
			endX: number;
			endY: number;
		} | null;
	} | null;

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
	 * 現在選択中の頂点。
	 * polyline/polygon が1つ選択されているときのみ有効。
	 * null の場合は頂点が選択されていない。
	 */
	selectedVertex: {
		objectId: string;
		vertexIndex: number;
	} | null;

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
	 * Shift ドラッグによる軸固定フィードバック。
	 * 軸固定中のみ non-null。dragEnd でクリアする。
	 * ビューポート全体に伸びるガイド線を AxisLockGuide が描画する。
	 */
	axisLockFeedback: AxisLockFeedback | null;

	/**
	 * インターナルクリップボード。
	 * navigator.clipboard への書き込み成否に関わらず、CopyCommand 実行時に同期的にセットされる。
	 * Cut 後に navigator.clipboard が利用不可でもペーストできるよう保証するためのフォールバック。
	 */
	internalClipboard: ClipboardData | null;

	/**
	 * 直前の Duplicate 操作の記録。Move-aware オフセット計算に使用。
	 * - newIds: 複製で生成した新しいオブジェクト ID
	 * - cx/cy: 生成直後の選択中心座標
	 * - offset: その複製で使用したオフセット
	 * 次の Duplicate 時に selectedIds == newIds なら delta を計算し、
	 * 動かしていなければ offset を再利用、動かしていれば delta を新 offset として採用する。
	 */
	lastDuplicate: {
		newIds: string[];
		cx: number;
		cy: number;
		offset: { x: number; y: number };
	} | null;
};
