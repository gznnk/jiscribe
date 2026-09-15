/** Escape the three sequences a TypeScript template literal cannot hold verbatim. */
function escapeTemplateLiteral(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/`/g, "\\`")
		.replace(/\$\{/g, "\\${");
}

/**
 * Wrap the composed canvas prompt in a TypeScript module, so a host gets it as a
 * string import rather than by reading a markdown file at run time.
 *
 * @param canvasPrompt the markdown of canvas-prompt.md, embedded verbatim (the
 *   escaping below is undone by the template literal itself).
 * @returns the module source, unformatted; main.ts runs prettier over it.
 */
export function generateCanvasPromptModule(canvasPrompt: string): string {
	return [
		"// 生成物。編集しないこと（pnpm generate:schema で再生成）。",
		"// 正本は engine/packages/doc-schema/parts/ にある。",
		"",
		`export const GENERATED_CANVAS_PROMPT = \`${escapeTemplateLiteral(canvasPrompt)}\`;`,
		"",
	].join("\n");
}
