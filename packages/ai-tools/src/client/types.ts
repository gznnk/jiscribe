// UI 側（パネル・撮影・表示操作・計測）がホストアプリから注入してもらう契約。
// doc の読み書き口は UI 専用ではない（サーバーがファイルを持つこともある）ため、
// ../canvasOps/docBridge に置いてある。

import type {
	Camera,
	CanvasInteractionStatus,
	CanvasPngExportOptions,
	ObjectOverlap,
	TextSlotMeasurement,
	Viewport,
} from "@jiscribe/canvas";
import type { Point, Rect } from "@jiscribe/geometry";

import type { AiFitTarget } from "../canvasOps";

/**
 * 現在のキャンバスを PNG に焼く関数。既定では図形全体にフィットしたもので、
 * 表示中のパン・ズームには依存しない（`options.region` を渡せば表示範囲や特定の
 * 図形だけを切り出せる）。キャンバス未マウント時は null を返す。
 */
export type CapturePng = (
	options?: CanvasPngExportOptions,
) => Promise<Blob | null>;

/** selectObjects の結果。要求した id のうち何が通り、何が落ちたか */
export type AiSelectionResult = {
	/** 実際に選択された id */
	selectedIds: readonly string[];
	/** 選択できなかった id（キャンバスに無い、コネクターを他と一緒に指した等） */
	ignoredIds: readonly string[];
};

/** getView の結果。カメラそのものと、そこから決まる可視範囲を 1 回で読む */
export type AiViewSnapshot = {
	/** カメラ（左上のワールド座標・倍率）と、実測された描画領域の画面上の大きさ */
	viewport: Viewport;
	/** 今画面に映っているワールド座標の矩形。ここに置いた図形はユーザーの目の前に出る */
	visibleWorldRect: Rect;
};

/**
 * doc だけでは答えられず、マウント済みのキャンバスが要る操作の窓口。ホストが
 * Canvas の imperative ハンドル（viewport / selection / measure / export /
 * interaction）から組み立てて渡す。キャンバスが無いホストでは注入できないため、
 * AiHandleOp はここを通る。
 */
export type AiHandleControl = {
	/**
	 * キャンバスが表示されていて操作できるか。false のとき他のメソッドは呼ばれない
	 * （ビューを切り替えている間は動かす相手そのものが居ない）
	 */
	isAvailable: () => boolean;
	/**
	 * 選択を差し替える。空配列で解除。
	 * 実際に選ばれた id と落ちた id を返す（存在しない id は落ちる）
	 */
	selectObjects: (ids: readonly string[]) => AiSelectionResult;
	/**
	 * 今選択されている id を読む。
	 *
	 * @returns 選択中の id（図形と、選択中のコネクター）。未選択なら空配列で、
	 *   それは失敗ではなく「何も選ばれていない」という答え
	 */
	getSelectedIds: () => readonly string[];
	/**
	 * ワールド座標の点を画面中央へ移動する。
	 *
	 * @param point - 中央に置くワールド座標
	 * @param zoom - 倍率。省略すると現在の倍率のまま（範囲外は丸められる）
	 * @returns 適用後のカメラ。動かす相手が居なければ null
	 */
	centerView: (point: { x: number; y: number }, zoom?: number) => Camera | null;
	/**
	 * カメラ（左上のワールド座標と倍率）を直接差し替える。倍率は丸められないので、
	 * 妥当な範囲であることは呼び出し側（ツールのスキーマ）が保証する。
	 *
	 * @param camera - 適用するカメラ。画面の大きさはコンテナ実測のままで変わらない
	 * @returns 適用したカメラ。動かす相手が居なければ null
	 */
	setView: (camera: Camera) => Camera | null;
	/**
	 * 今のカメラと、それが映しているワールド座標の範囲を 1 回で読む。
	 *
	 * @returns カメラと可視範囲。キャンバスが無ければ null
	 */
	getView: () => AiViewSnapshot | null;
	/**
	 * 全体または選択中のオブジェクトが収まるように表示を合わせる。
	 *
	 * @param target - 合わせる対象
	 * @returns 適用後のカメラ。対象が無い（空のキャンバス・未選択）ときは null で、
	 *   表示は動かない
	 */
	fitView: (target: AiFitTarget) => Camera | null;
	/**
	 * 指定したワールド矩形が収まるように表示を合わせる。
	 *
	 * @param rect - 収める範囲。画面の縦横比の都合で、実際にはこれより広く映る軸が
	 *   出る（映る範囲は getView で読み直す）
	 * @returns 適用後のカメラ。どちらの軸にも広がりが無い矩形（点）なら null で、
	 *   表示は動かない
	 */
	fitViewToRect: (rect: Rect) => Camera | null;
	/**
	 * テキストスロット 1 つの描画結果（描かれる箱・折り返し後の寸法・行数・
	 * はみ出しの有無）を測る。
	 *
	 * @param id - スロットを持つオブジェクトの id
	 * @param slotId - 測るスロット。省略すると先頭のスロット（編集時に開くもの）
	 * @returns 計測結果。id が無い・テキスト領域を持たない型（コネクター・poly 系）・
	 *   そのスロットが無いときは null
	 */
	measureText: (id: string, slotId?: string) => TextSlotMeasurement | null;
	/**
	 * 重なっている図形の組を、重なりの広い順に返す。
	 *
	 * @param ids - 比べる図形。省略するとキャンバス上の全オブジェクト。
	 *   キャンバスに無い id・コネクター・グループは黙って除かれる
	 * @returns 重なった組の一覧。重なりが無ければ空配列（失敗ではない）
	 */
	findOverlaps: (ids?: readonly string[]) => readonly ObjectOverlap[];
	/**
	 * コネクターが実際に描かれている経路を、始点から終点の順に返す。
	 *
	 * @param id - 辿るコネクターの id
	 * @returns 端点と曲がり角の頂点列。id が無い・コネクターでない・端点を解決
	 *   できない（接続先が消えている）ときは null
	 */
	measureConnectorPath: (id: string) => readonly Point[] | null;
	/**
	 * 装飾込みで実際に描かれている範囲を、指定した全 id の合成矩形で返す。
	 *
	 * @param ids - 測る対象。複数渡すと 1 つの矩形に合成される
	 * @returns 合成矩形。描画範囲を持つ id が 1 つも無ければ null
	 */
	measureVisualBounds: (ids: readonly string[]) => Rect | null;
	/**
	 * ワールド座標の点・矩形に描かれているオブジェクトを手前から返す。
	 *
	 * @param target - 点なら実際の輪郭で、矩形ならバウンディングボックスの重なりで
	 *   判定する
	 * @param tolerance - 線状の図形（コネクター・ポリライン）が線からどれだけ離れて
	 *   いても当たりとするか（ワールド px）。省略するとキャンバスの既定値
	 * @returns 手前から順の id。何も無ければ空配列（失敗ではない）。グループは
	 *   返らず、メンバーが個別に判定される
	 */
	hitTest: (target: Point | Rect, tolerance?: number) => readonly string[];
	/**
	 * 現在のキャンバスを SVG 文字列にする。
	 *
	 * @returns SVG 文字列。キャンバス未マウント時は null
	 */
	toSvgString: () => string | null;
	/**
	 * ユーザーが今キャンバスに対して何をしているか（ドラッグ中か・どのテキストを
	 * 編集中か・モーダルが開いているか）を読む。
	 *
	 * @returns その瞬間のスナップショット。キャンバスが無ければ null
	 */
	getInteractionStatus: () => CanvasInteractionStatus | null;
	/**
	 * client 座標（PointerEvent.clientX/Y と同じ空間）をワールド座標へ変換する。
	 *
	 * @param clientPoint - ウィンドウ左上を原点とする画面上の点
	 * @returns ワールド座標の点。キャンバスが `<svg>` をマウントする前は null
	 */
	toWorld: (clientPoint: Point) => Point | null;
	/**
	 * {@link toWorld} の逆。パン・ズームのたびに答えが変わる。
	 *
	 * @param worldPoint - ワールド座標の点
	 * @returns client 座標の点。キャンバスが `<svg>` をマウントする前は null
	 */
	toClient: (worldPoint: Point) => Point | null;
};
