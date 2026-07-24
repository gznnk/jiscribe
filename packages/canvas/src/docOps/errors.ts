/**
 * docOps が投げる、利用者（AI / ツール呼び出し側）へそのまま返せる想定内エラー。
 *
 * 「接続先が connectable でない」など params 自体は型的に正しくても実行時に成立しない
 * ケースを表す。adapter（MCP / Function Calling）はこれを内部エラーと区別し、
 * message をそのまま利用者へ返せる。
 */
export class DocOperationError extends Error {}
