import type { Point } from "@workspace/geometry";

import type { Viewport } from "./Viewport";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../objects/base/ObjectState";
import type { GroupState } from "../objects/primitives/group/GroupState";
import type { ConnectorState } from "../objects/connections/connector/ConnectorState";

export type CanvasState = {
	/**
	 * Map of all objects in the canvas, normalized by ID.
	 * Key is the object ID, value is the object state.
	 * This flat structure allows O(1) access and updates.
	 */
	objects: Record<string, ObjectState>;

	/**
	 * Sorted list of object IDs at the root level (Z-index order).
	 * Objects in groups are not listed here, but in the group's children array.
	 */
	rootIds: string[];

	/**
	 * List of IDs for independent connectors (if managed separately from root objects).
	 */
	connectorIds: string[];

	/**
	 * Currently selected object IDs.
	 */
	selectedIds: string[];

	/**
	 * IDs of objects currently hovered during drag operations.
	 * Used to detect DragOver/DragLeave events.
	 */
	hoveredIds: string[];

	/**
	 * Snapshot of CanvasState at the start of an event/gesture.
	 * Used to compare or restore state during event handling.
	 */
	eventStartState: CanvasState | null;

	/**
	 * Current viewport state.
	 */
	viewport: Viewport;

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
};
