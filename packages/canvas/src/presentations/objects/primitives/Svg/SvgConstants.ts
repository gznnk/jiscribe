/** SVG 名前空間。DOMPurify / DOMParser に渡す。 */
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * SVG の表示・解析に失敗したときに代わりに描画するプレースホルダ。
 * 100×100px の自己完結 SVG。VSCode になじむミュートグレーの破線枠＋警告アイコン。
 */
export const ERROR_SVG_ICON_STRING =
	'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><title>SVG render error</title><desc>Placeholder shown when the SVG content is missing or cannot be parsed.</desc><rect x="3" y="3" width="94" height="94" rx="8" fill="none" stroke="#8b8b8b" stroke-width="2" stroke-dasharray="6 5" opacity="0.6"/><g fill="none" stroke="#8b8b8b" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M50 28 L73 70 H27 Z"/><line x1="50" y1="44" x2="50" y2="55"/></g><circle cx="50" cy="62" r="2.8" fill="#8b8b8b"/></svg>';
