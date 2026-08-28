// ビューアが扱う図形セット。UI プラグイン（Canvas 描画用）と doc プラグイン
// （パース用）を 1 箇所から出す。
//
// **サーバー側の canvasDefinitions.ts と同じ集合であること。**ずれると、AI が
// ツールで足した図形をビューアが unknown type として弾き、画面が更新されなくなる。

import { createCanvasParser } from "@jiscribe/doc";
import { standardPlugins } from "@jiscribe/standard-shapes";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";

/** Canvas の initialConfig に渡す UI プラグイン一式 */
export const plugins = standardPlugins;

/** WebSocket で届いた本文を doc に起こすためのパーサー */
export const canvasParser = createCanvasParser({ plugins: standardDocPlugins });
