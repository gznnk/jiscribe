import { toCanvasCapabilities } from "@jiscribe/ai-tools";
import { createCanvasParser, createDocOps } from "@jiscribe/doc";
import { offerTextMeasurement } from "@jiscribe/doc/unstable";
import { nodeTextMeasurement } from "@jiscribe/doc-tools";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";

/** 読み込み・書き戻しが共有するパーサー。図形の集合は出荷図形セットが正本。 */
export const canvasParser = createCanvasParser({ plugins: standardDocPlugins });

// docOps は height 省略の図形の高さをテキストから導くため、計測を要求する。
// このモジュールの評価時に名乗り出ておかないと、ツールの呼び出し順によって
// 最初の計測が未提示のまま走って落ちる。
offerTextMeasurement(nodeTextMeasurement());

/**
 * 自前の追加ツールと、ai-tools 由来の doc 操作（applyCanvasOp）が共有する doc-ops。
 * パーサーと同じプラグイン集合でないと、プラグイン図形を追加した直後の書き戻し・
 * 次回読み込みが unknown type で失敗する。
 */
export const docOps = createDocOps({ plugins: standardDocPlugins });

/**
 * ai-tools のツール宣言が図形型の enum を埋めるのに使う能力表。パーサー・docOps と
 * 同じプラグイン集合から導くので、宣言に載る型と実際に追加できる型が食い違わない。
 */
export const canvasCapabilities = toCanvasCapabilities(standardDocPlugins);
