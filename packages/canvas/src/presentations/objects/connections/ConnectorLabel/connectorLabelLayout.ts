import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";

/** ラベル既定スタイル（ConnectorLabel が値を持たないときのフォールバック）。 */
export const CONNECTOR_LABEL_DEFAULTS = {
	fontColor: "auto",
	fontSize: 16,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
} as const;

/** テキスト周りの内側余白（背景 knockout を含むボックスのパディング）。 */
export const CONNECTOR_LABEL_PADDING_X = 6;
export const CONNECTOR_LABEL_PADDING_Y = 2;

/** ラベルボックスの最小・最大幅（コンテンツ幅 + パディング後の値、ワールド単位）。 */
export const CONNECTOR_LABEL_MIN_WIDTH = 16;
export const CONNECTOR_LABEL_MAX_WIDTH = 240;

export type ConnectorLabelFont = {
	fontSize: number;
	fontFamily: string;
	fontWeight: string;
};

// 計測専用のオフスクリーン canvas（DOM レイアウトを発生させず幅を測る）。
let measureCanvas: HTMLCanvasElement | null = null;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
	if (typeof document === "undefined") {
		return null;
	}
	if (!measureCanvas) {
		measureCanvas = document.createElement("canvas");
	}
	return measureCanvas.getContext("2d");
};

/** 改行で分割した各行の幅を測る。canvas 2d を使い DOM レイアウトを起こさない。 */
const measureLineWidths = (
	lines: readonly string[],
	font: ConnectorLabelFont,
): number[] => {
	const ctx = getMeasureContext();
	if (!ctx) {
		// 計測不能（非ブラウザ環境）では文字数からの粗い近似でフォールバックする。
		return lines.map((line) => line.length * font.fontSize * 0.6);
	}
	ctx.font = `${font.fontWeight} ${font.fontSize}px ${font.fontFamily}`;
	return lines.map((line) => ctx.measureText(line).width);
};

export type ConnectorLabelBox = { width: number; height: number };

/**
 * ラベルボックスの寸法（パディング込み）を求める。
 *
 * 幅は最長行 + 左右パディングを最小・最大幅でクランプ。高さは最大幅で折り返した
 * 行数（明示改行 + 自動折り返し）を見積もって算出するため、横伸長・折り返しの
 * 両方で表示が欠けない。
 */
export const calcConnectorLabelBox = (
	text: string,
	font: ConnectorLabelFont,
): ConnectorLabelBox => {
	const lines = text.length === 0 ? [""] : text.split("\n");
	const lineWidths = measureLineWidths(lines, font);
	const maxLineWidth = lineWidths.reduce((max, w) => Math.max(max, w), 0);

	const width = Math.min(
		CONNECTOR_LABEL_MAX_WIDTH,
		Math.max(
			CONNECTOR_LABEL_MIN_WIDTH,
			maxLineWidth + CONNECTOR_LABEL_PADDING_X * 2,
		),
	);

	// 折り返し後の表示行数を見積もる（各論理行が利用可能幅を超えた分だけ増える）。
	const availableWidth = Math.max(1, width - CONNECTOR_LABEL_PADDING_X * 2);
	const visualLineCount = lineWidths.reduce(
		(count, w) => count + Math.max(1, Math.ceil(w / availableWidth)),
		0,
	);

	const height =
		visualLineCount * font.fontSize * TEXT_LINE_HEIGHT +
		CONNECTOR_LABEL_PADDING_Y * 2;

	return { width, height };
};
