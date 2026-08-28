/**
 * ホストを立てられない事情を表すエラー。中身は利用者への案内なので、ツール層は
 * これを内部エラーではなく `error: 〜` としてそのまま AI へ返す。
 *
 * 値と型が同居する canvasHost.ts から切り出してあるのは、viewerAssets.ts が
 * これを投げる側になり、逆向きの参照が循環になるため。
 */
export class CanvasHostError extends Error {}
