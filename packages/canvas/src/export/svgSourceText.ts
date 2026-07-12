/** Namespace for jiscribe-specific data embedded in SVG for round-tripping. */
export const SVG_SOURCE_NS = "https://jiscribe.dev/ns/canvas";

/** Local name of the embedded source element (serialized as `jiscribe:source`). */
export const SVG_SOURCE_LOCAL_NAME = "source";

// embedCanvasSource（canvasSourceMetadata.ts）が生成する要素のシリアライズ済みタグ。
// 手書き等でプレフィックスが異なる SVG は対象外（jiscribe のエクスポートのみ扱う）。
const SOURCE_TAG = `jiscribe:${SVG_SOURCE_LOCAL_NAME}`;

const SOURCE_ELEMENT_PATTERN = new RegExp(
	`(<${SOURCE_TAG}\\b[^>]*>)([\\s\\S]*?)(</${SOURCE_TAG}>)`,
);

const escapeXmlText = (text: string): string =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const unescapeXmlText = (text: string): string =>
	text.replace(
		/&(#x[0-9a-fA-F]+|#\d+|lt|gt|quot|apos|amp);/g,
		(_, entity: string) => {
			switch (entity) {
				case "lt":
					return "<";
				case "gt":
					return ">";
				case "quot":
					return '"';
				case "apos":
					return "'";
				case "amp":
					return "&";
			}
			return String.fromCodePoint(
				entity.startsWith("#x")
					? parseInt(entity.slice(2), 16)
					: parseInt(entity.slice(1), 10),
			);
		},
	);

/**
 * `.jis.svg` テキストから埋め込みソース JSON を取り出す（DOM 不要、Node でも動く）。
 * 埋め込みが無い・空の場合は null。JSON としての妥当性は検証しない。
 */
export const extractCanvasSourceFromSvgText = (
	svgText: string,
): string | null => {
	const match = SOURCE_ELEMENT_PATTERN.exec(svgText);
	if (!match) {
		return null;
	}
	const sourceJson = unescapeXmlText(match[2]).trim();
	return sourceJson === "" ? null : sourceJson;
};

/**
 * SVG テキストの埋め込みソースを sourceJson へ差し替えたテキストを返す
 * （DOM 不要、Node でも動く）。埋め込み要素が無い場合は null。
 */
export const replaceCanvasSourceInSvgText = (
	svgText: string,
	sourceJson: string,
): string | null => {
	if (!SOURCE_ELEMENT_PATTERN.test(svgText)) {
		return null;
	}
	return svgText.replace(
		SOURCE_ELEMENT_PATTERN,
		(_matched, openTag: string, _content, closeTag: string) =>
			`${openTag}${escapeXmlText(sourceJson)}${closeTag}`,
	);
};
