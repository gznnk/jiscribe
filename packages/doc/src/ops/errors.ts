/**
 * Expected error from docOps whose message can be handed straight back to the caller
 * (an AI or tool-calling client).
 *
 * It covers cases where params are well-typed but do not hold at runtime, such as a target
 * that is not connectable. Adapters (MCP / function calling) distinguish it from internal
 * errors and surface `message` verbatim.
 */
export class DocOperationError extends Error {}
