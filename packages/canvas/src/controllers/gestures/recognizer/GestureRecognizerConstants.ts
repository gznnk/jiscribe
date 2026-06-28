/** ドラッグ判定の閾値（ピクセルの2乗） */
export const DRAG_THRESHOLD = 3 * 3; // 3 pixels squared

/** エッジスクロールを発動するビューポート端からの距離（ピクセル） */
export const AUTO_SCROLL_THRESHOLD = 20;

/** エッジスクロール時のスクロール量（ピクセル） */
export const AUTO_SCROLL_STEP_SIZE = 10;

/** ダブルクリックとみなす時間の閾値（ミリ秒） */
export const DOUBLE_CLICK_THRESHOLD = 300;

/**
 * ダブルクリックとみなす 2 クリック間の距離の閾値（画面ピクセルの2乗）。
 * 時間内でも前回クリックからこの距離より離れていれば別クリック扱いにする。
 * world 座標だと zoom で意味が変わるため、距離は client（画面）座標で測る。
 */
export const DOUBLE_CLICK_DISTANCE_THRESHOLD = 5 * 5; // 5 pixels squared
