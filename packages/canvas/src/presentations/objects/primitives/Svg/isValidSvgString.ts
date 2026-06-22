import { isString } from "@workspace/basic-validators";

/**
 * 文字列が（パース可能で）ルートが <svg> な有効な SVG かを判定する。
 * サニタイズ後の文字列に対して使い、不正なら呼び出し側でエラーアイコンへ差し替える。
 */
export const isValidSvgString = (svgString: string): boolean => {
	if (!isString(svgString) || svgString.length === 0) {
		return false;
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgString, "image/svg+xml");

		if (doc.querySelector("parsererror")) {
			return false;
		}

		return doc.documentElement.tagName.toLowerCase() === "svg";
	} catch {
		return false;
	}
};
