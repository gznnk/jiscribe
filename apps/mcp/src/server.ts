import { basename, dirname, isAbsolute, resolve } from "node:path";

import {
	createCanvasToolDescriptors,
	isAiDocOp,
	type AiCanvasOpOutcome,
	type AiDocOp,
	type CanvasToolArgs,
} from "@jiscribe/ai-tools";
import {
	applyCanvasOp,
	createCanvasOpHistory,
	type CanvasOpHistory,
} from "@jiscribe/ai-tools/apply";
import { DocOperationError, type CanvasDoc } from "@jiscribe/doc";
import type { Diagnostic } from "@jiscribe/doc-tools";
import {
	resolveContentBox,
	diagnoseDoc,
	measureWrappedText,
	validateDoc,
} from "@jiscribe/doc-tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { canvasCapabilities, docOps } from "./canvasDefinitions";
import {
	CanvasFileError,
	ensureCanvasFile,
	loadCanvasFile,
	readCanvasFileText,
	saveCanvasFile,
} from "./canvasStore";
import { formatDiagnostics } from "./diagnosticReport";
import { startCanvasHost, type CanvasHost } from "./host/canvasHost";
import { CanvasHostError } from "./host/canvasHostError";
import { createPathLock, type PathLock } from "./pathLock";

/**
 * The tool definitions of the Jiscribe MCP server. Starting it over stdio is
 * `./index`'s job.
 *
 * The tools it exposes come in three groups.
 *
 * 1. The ones this server has of its own (written out directly below)
 *    - `open_canvas`: starts a viewer locally and opens it in a browser. From
 *      then on the same file is where the AI rewriting it and a person correcting
 *      it on screen work together
 *    - `close_canvas`: closes that window and folds the server up too. A person
 *      closing the window ends up in the same place (the host is folded up once
 *      the last window is gone)
 *    - `diagnose_canvas`: validation, plus diagnosis of drawing problems such
 *      as overflow
 *    - `measure_text`: without holding a diagram, measures whether a string fits
 *      a shape of a given size
 *    - `add_rect` / `add_ellipse`: entry points giving default sizes to the two
 *      most frequently used shapes
 * 2. The ones `@jiscribe/ai-tools` declares that a document alone can answer
 *    (`registerDocTools`). Adding, moving, aligning, grouping, style, the colour
 *    of the canvas surface, declaring the view, reading, undo and so on.
 *    The declarations are written assuming "the document
 *    currently open", so a `path` that picks the target is added to read them as
 *    file operations
 * 3. The ones from ai-tools that need a mounted canvas (`registerHandleTools`).
 *    Capture, camera, selection, measurement. Running them becomes a round trip
 *    to the viewer open_canvas started
 *
 * A name collision between 1 and 2 or 3 makes the later registration win and one
 * of them silently disappear, so registration goes through `registerName`, which
 * throws at startup.
 *
 * Every argument schema is closed with `.strict()`. zod drops unknown keys
 * silently by default, so a call trying to place an ellipse with `cx` / `rx`
 * would succeed as a default-sized shape at the origin.
 * `additionalProperties: false` shows up in the JSON Schema too, so the AI can
 * read it before calling.
 *
 * The set of shapes handled is decided in one place, `./canvasDefinitions`
 * (built-ins plus plugins).
 */

// The tools' default dimensions. addObject falls through to the factory defaults
// (rect 100x100 and so on), so they are stated explicitly at the boundary to keep
// the tool behaviour as it has been. add_ellipse keeps its center-based
// (cx/cy/rx/ry) input and converts it to addObject's top-left basis.
const DEFAULT_RECT_WIDTH = 160;
const DEFAULT_RECT_HEIGHT = 80;
const DEFAULT_ELLIPSE_RX = 80;
const DEFAULT_ELLIPSE_RY = 50;

/**
 * The font stack a document with no font specified is drawn in (the same sans as
 * the canvas). measure_text holds no document, so there is nothing to do but
 * write it out here.
 */
const DEFAULT_FONT_FAMILY = '"Source Sans 3", "Noto Sans JP", sans-serif';

const pathArg = z
	.string()
	.describe("Absolute path to the target .jis.json file.");

/**
 * Build an MCP server with the tools registered.
 *
 * Returns a new instance per call. An McpServer can bind only one transport, so a
 * different connection needs a different instance.
 */
export function createJiscribeMcpServer(): McpServer {
	const server = new McpServer({
		name: "jiscribe",
		version: "0.9.0",
	});

	// The viewer is started only when open_canvas is first called, and reused after
	// that. Its lifetime follows the windows: once the last one closes it is folded
	// up and the port given back
	let host: CanvasHost | null = null;

	/**
	 * Start the host, arranging for it to be folded up once every window is closed.
	 *
	 * @param workspaceRoot The base directory of the file API (absolute path)
	 * @returns The started host. It has nothing to show yet, so call openFile next
	 */
	const startHost = async (workspaceRoot: string): Promise<CanvasHost> => {
		const started: CanvasHost = await startCanvasHost({
			workspaceRoot,
			onViewersGone: () => {
				void (async () => {
					// If another host has already taken over, this one is done with and
					// has been folded up
					if (host !== started) {
						return;
					}
					host = null;
					await started.close();
				})();
			},
		});
		return started;
	};

	// Let operations on the same file through one at a time. Being cut in on
	// between load → modify → write back makes the later write-back discard the
	// earlier change along with it
	const withPathLock = createPathLock();

	// Check at startup that the built-in tools and the ai-tools ones do not collide
	// by name. Registering the same name twice makes the later one win and one of
	// them silently disappear, so it is thrown before it gets through
	const registeredNames = new Set<string>();
	const registerName = (name: string): string => {
		if (registeredNames.has(name)) {
			throw new Error(`duplicate MCP tool name: ${name}`);
		}
		registeredNames.add(name);
		return name;
	};

	server.registerTool(
		registerName("open_canvas"),
		{
			description: [
				"Open a .jis.json file in a canvas viewer: starts a local web server inside this MCP process and opens the file in a browser window.",
				"The file stays the single source of truth. The editing tools below write to it and the viewer follows within a moment; when a person moves or retypes shapes in the viewer, it writes the file back, so reading the file again shows what they changed.",
				"A file that does not exist yet is created as an empty canvas, which is how a new diagram is started.",
				"Calling it again switches the viewer to another file. Naming a file outside the directory currently being served restarts the server on that file's directory, and the open viewer reconnects on its own.",
				"Returns the viewer URL, which is worth passing on to the user.",
			].join(" "),
			inputSchema: z.object({ path: pathArg }).strict(),
		},
		async ({ path }) =>
			runTool(async () => {
				if (!isAbsolute(path)) {
					throw new CanvasFileError(
						`path must be an absolute path, but got: ${path}`,
					);
				}
				const isCreated = await withPathLock(path, () =>
					ensureCanvasFile(path),
				);
				const workspaceRoot = resolve(dirname(path));

				// The file API cannot get outside the workspace, so being pointed at
				// another directory restarts the host on that directory (the viewer
				// reconnects on its own)
				if (host !== null && host.workspaceRoot !== workspaceRoot) {
					await host.close();
					host = null;
				}
				host ??= await startHost(workspaceRoot);
				await host.openFile(basename(path));

				const state = isCreated ? "created and opened" : "opened";
				return `${state} ${basename(path)} — viewer: ${host.url}`;
			}),
	);

	server.registerTool(
		registerName("close_canvas"),
		{
			description: [
				"Close the canvas viewer window and stop the local web server that open_canvas started.",
				"Use it when the diagram is finished and the window is in the way; the .jis.json file is untouched and open_canvas brings it back.",
				"A window the browser refuses to close is reported as still open, and the server is left running for it.",
			].join(" "),
			inputSchema: z.object({}).strict(),
		},
		async () =>
			runTool(async () => {
				if (host === null) {
					return "no canvas viewer is open";
				}
				const { closedCount, remainingCount } = await host.closeViewers();
				if (remainingCount > 0) {
					// Stopping the server while a window remains leaves that window
					// looking for somewhere to reconnect. It would join whichever host
					// takes this port next, so it is not stopped
					return `error: ${remainingCount} viewer window(s) refused to close, so the local server is left running; close the window(s) by hand`;
				}
				await host.close();
				host = null;
				return closedCount === 0
					? "no viewer window was open; stopped the local server"
					: `closed ${closedCount} viewer window(s) and stopped the local server`;
			}),
	);

	server.registerTool(
		registerName("diagnose_canvas"),
		{
			description: [
				"Check an existing .jis.json file: validation (schema + parser) plus a diagnosis of whether each shape's text actually fits inside it.",
				"Names the file by path, so a large diagram never has to be sent through the conversation; this is the only validation entry point, and it reports JSON syntax errors too.",
				"Overflow is only diagnosed when the file itself validates, since a shape with an invalid size has no meaningful content box.",
				"Returns one line per finding, or valid: true when there is nothing to report.",
			].join(" "),
			inputSchema: z.object({ path: pathArg }).strict(),
		},
		async ({ path }) =>
			runTool(async () => {
				const text = await withPathLock(path, () => readCanvasFileText(path));
				const result = validateDoc(text);
				const diagnostics: Diagnostic[] = [...result.diagnostics];
				if (result.ok && result.doc !== undefined) {
					diagnostics.push(...diagnoseDoc(result.doc));
				}
				return formatDiagnostics(diagnostics);
			}),
	);

	server.registerTool(
		registerName("measure_text"),
		{
			description: [
				"Measure how a single string lays out inside a shape of a given size, without a document to put it in.",
				"width / height are the shape's own bounding box, the same numbers a document holds; the content box is what the outline and the shared text padding leave of them.",
				"height may be omitted only for rect, whose content width follows from its width alone, and for types that draw their label outside their box.",
				"Returns the line count, the box the wrapped lines take, the content box, and whether the text fits.",
				"Use this before sizing a shape, so a label is not written into a box too small for it.",
			].join(" "),
			inputSchema: z
				.object({
					text: z.string().describe("The text to lay out, newlines included."),
					fontSize: z.number().positive().describe("Font size in px."),
					shape: z
						.string()
						.default("rect")
						.describe(
							"Object type to measure against (rect, stadium, card, ...). A type that draws its label outside its outline is measured without a fit verdict, since its box does not constrain the text.",
						),
					width: z.number().positive().describe("Shape width in px."),
					height: z
						.number()
						.positive()
						.optional()
						.describe("Shape height in px (required for every type but rect)."),
					bold: z
						.boolean()
						.default(false)
						.describe("Whether the text is bold."),
				})
				.strict(),
		},
		async (params) => textResult(measureTextInShape(params)),
	);

	server.registerTool(
		registerName("add_rect"),
		{
			description:
				"Add a rectangle to a .jis.json file (read → modify → validate → write). Returns the new object id.",
			inputSchema: z
				.object({
					path: pathArg,
					x: z.number().describe("Top-left x in px."),
					y: z.number().describe("Top-left y in px."),
					width: z
						.number()
						.min(0)
						.optional()
						.describe("Width in px (default 160)."),
					height: z
						.number()
						.min(0)
						.optional()
						.describe("Height in px (default 80)."),
					text: z
						.string()
						.optional()
						.describe("Label text inside the rectangle."),
				})
				.strict(),
		},
		async ({ path, ...params }) =>
			runMutation(withPathLock, path, (doc) => {
				// Fill in the tool's default 160x80 at the boundary, rather than falling
				// through to addObject's factory defaults.
				const id = docOps.addObject(doc, "rect", {
					x: params.x,
					y: params.y,
					width: params.width ?? DEFAULT_RECT_WIDTH,
					height: params.height ?? DEFAULT_RECT_HEIGHT,
					...(params.text !== undefined ? { text: params.text } : {}),
				});
				return `added rect "${id}" at (${params.x}, ${params.y})`;
			}),
	);

	server.registerTool(
		registerName("add_ellipse"),
		{
			description:
				"Add an ellipse to a .jis.json file (read → modify → validate → write). Returns the new object id.",
			inputSchema: z
				.object({
					path: pathArg,
					cx: z.number().describe("Center x in px."),
					cy: z.number().describe("Center y in px."),
					rx: z
						.number()
						.min(0)
						.optional()
						.describe("X radius in px (default 80)."),
					ry: z
						.number()
						.min(0)
						.optional()
						.describe("Y radius in px (default 50)."),
					text: z
						.string()
						.optional()
						.describe("Label text inside the ellipse."),
				})
				.strict(),
		},
		async ({ path, ...params }) =>
			runMutation(withPathLock, path, (doc) => {
				const rx = params.rx ?? DEFAULT_ELLIPSE_RX;
				const ry = params.ry ?? DEFAULT_ELLIPSE_RY;
				const id = docOps.addObject(doc, "ellipse", {
					x: params.cx - rx,
					y: params.cy - ry,
					width: rx * 2,
					height: ry * 2,
					...(params.text !== undefined ? { text: params.text } : {}),
				});
				return `added ellipse "${id}" at (${params.cx}, ${params.cy})`;
			}),
	);

	// undo can only go back while things are "as the AI left them", so the history
	// is held per edited file
	const historyByPath = new Map<string, CanvasOpHistory>();
	const takeHistory = (filePath: string): CanvasOpHistory => {
		const existing = historyByPath.get(filePath);
		if (existing !== undefined) {
			return existing;
		}
		const created = createCanvasOpHistory();
		historyByPath.set(filePath, created);
		return created;
	};

	/**
	 * Hand one file to an operation as a document. A read-only operation does not
	 * call replaceDoc, and then nothing is written back either (so the viewer is
	 * not shaken by a pointless update).
	 */
	const applyDocOpToFile = async (
		filePath: string,
		op: AiDocOp,
	): Promise<AiCanvasOpOutcome> => {
		const absolutePath = resolve(filePath);
		return await withPathLock(absolutePath, async () => {
			const loadedDoc = await loadCanvasFile(absolutePath);
			let nextDoc: CanvasDoc | null = null;
			const outcome = applyCanvasOp(
				op,
				{
					getDoc: () => nextDoc ?? loadedDoc,
					replaceDoc: (replacement) => {
						nextDoc = replacement;
					},
				},
				takeHistory(absolutePath),
				docOps,
			);
			if (nextDoc !== null) {
				await saveCanvasFile(absolutePath, nextDoc);
			}
			return outcome;
		});
	};

	registerDocTools(server, registerName, applyDocOpToFile);
	registerHandleTools(server, registerName, () => host);

	return server;
}

/**
 * Register the tools ai-tools declares that a document alone can answer.
 *
 * The declaring side is written assuming "the document currently open", so a
 * `path` that picks the target is added to read them as operations on a file. No
 * declared tool has a `path`, so this addition never collides with an existing
 * argument.
 *
 * @param server Where the tools are registered
 * @param registerName The registration entry that rejects duplicate names
 * @param applyToFile What actually applies one operation to one file
 */
function registerDocTools(
	server: McpServer,
	registerName: (name: string) => string,
	applyToFile: (filePath: string, op: AiDocOp) => Promise<AiCanvasOpOutcome>,
): void {
	for (const descriptor of createCanvasToolDescriptors(canvasCapabilities)) {
		if (descriptor.drives.some((ref) => ref.startsWith("handle."))) {
			continue;
		}
		server.registerTool(
			registerName(descriptor.name),
			{
				description: descriptor.description,
				inputSchema: z
					.object({ path: pathArg, ...descriptor.inputSchema })
					.strict(),
			},
			async ({ path, ...args }: CanvasToolArgs & { path: string }) =>
				runTool(async () => {
					const op = descriptor.toOp(args);
					if (!isAiDocOp(op)) {
						// Only happens when the `drives` declaration and where toOp goes
						// disagree
						return `internal error: ${descriptor.name} is declared to need only a document but produced a canvas-handle operation`;
					}
					const outcome = await applyToFile(path, op);
					return outcome.ok ? outcome.text : `error: ${outcome.text}`;
				}),
		);
	}
}

/**
 * `measure_text` collides by name between the built-in one (measuring from
 * dimensions alone, before anything is placed in a diagram) and the ai-tools one
 * (measuring a slot drawn on screen). They are different things, so the one that
 * comes in later is renamed and both are kept.
 */
const HANDLE_TOOL_RENAMES: Readonly<Record<string, string>> = {
	measure_text: "measure_rendered_text",
};

/**
 * A sentence added to every tool that needs the screen. The declarations are
 * written assuming "the document currently open" and never mention where the
 * target lives, so the difference in address — document operations pick a file
 * with `path`, while these look only at the one canvas on screen — cannot be read
 * off the tool list
 */
const HANDLE_TOOL_SCOPE_NOTE =
	"This acts on the canvas open in the viewer rather than on a file, which is why it takes no path: call open_canvas first, and note that the editing tools write to the path they are given, not to whatever is on screen.";

/** Adds a sentence to a renamed tool making clear which of the two to use */
const HANDLE_TOOL_DESCRIPTION_NOTES: Readonly<Record<string, string>> = {
	measure_text:
		"To size a shape before putting it in the document, use measure_text instead.",
};

/**
 * Register the tools ai-tools declares that need a mounted canvas.
 *
 * The argument schema is the declaration as it stands, and the description gains
 * a sentence saying the target is the screen. Only running them is swapped for a
 * round trip to the viewer.
 * The targets are the ones whose `drives` names a canvas handle (a declaration,
 * so it is known without building the arguments).
 *
 * @param server The server to register on
 * @param registerName The registration entry that rejects duplicate names
 * @param getHost The current host. null when called before open_canvas
 */
function registerHandleTools(
	server: McpServer,
	registerName: (name: string) => string,
	getHost: () => CanvasHost | null,
): void {
	for (const descriptor of createCanvasToolDescriptors(canvasCapabilities)) {
		if (!descriptor.drives.some((ref) => ref.startsWith("handle."))) {
			continue;
		}
		const note = HANDLE_TOOL_DESCRIPTION_NOTES[descriptor.name];
		server.registerTool(
			registerName(HANDLE_TOOL_RENAMES[descriptor.name] ?? descriptor.name),
			{
				description:
					note === undefined
						? `${descriptor.description} ${HANDLE_TOOL_SCOPE_NOTE}`
						: `${descriptor.description} ${HANDLE_TOOL_SCOPE_NOTE} ${note}`,
				inputSchema: z.object(descriptor.inputSchema).strict(),
			},
			async (args: CanvasToolArgs) => {
				const host = getHost();
				if (host === null) {
					return textResult(
						"error: no canvas is open, so there is nothing on screen to capture, move, select, or measure; call open_canvas first",
					);
				}
				const op = descriptor.toOp(args);
				if (isAiDocOp(op)) {
					// Only happens when the `drives` declaration and where toOp goes
					// disagree
					return textResult(
						`internal error: ${descriptor.name} is declared to drive the canvas handle but produced a document operation`,
					);
				}
				const outcome = await host.runHandleOp(op);
				if (outcome.imagePngBase64 !== undefined) {
					return {
						content: [
							{
								type: "image" as const,
								data: outcome.imagePngBase64,
								mimeType: "image/png",
							},
							{ type: "text" as const, text: outcome.text },
						],
					};
				}
				return textResult(outcome.ok ? outcome.text : `error: ${outcome.text}`);
			},
		);
	}
}

/**
 * Round a displayed figure to 0.1px. A difference below a px is nothing the AI
 * can act on.
 */
function round(value: number): number {
	return Math.round(value * 10) / 10;
}

/**
 * Measure the result of pouring one string into a shape of a given type and size.
 * Same semantics as the CLI's `jiscribe measure` (width / height are the shape's
 * own outline, the verdict is made against the content box, and with no height
 * given the height is not judged). The wording is kept in line with the CLI too
 * (engine/apps/cli/src/measureCommand.ts): a type that draws outside its box is
 * only measured and gets no fit verdict, and a type outside the shipped set comes
 * back as an error.
 */
function measureTextInShape(params: {
	text: string;
	fontSize: number;
	shape: string;
	width: number;
	height?: number;
	bold: boolean;
}): string {
	const { text, fontSize, shape, width, height, bold } = params;
	const resolution = resolveContentBox({
		type: shape,
		width,
		height: height ?? 0,
	});
	if (resolution.kind === "unknown") {
		return `error: unknown shape type "${shape}" (not in the standard set)`;
	}

	const font = {
		fontSize,
		fontFamily: DEFAULT_FONT_FAMILY,
		fontWeight: bold ? "bold" : "normal",
	};

	// The box does not constrain the text, so it is measured as it is without
	// wrapping (the shape as it is drawn at its automatic size).
	if (resolution.kind === "outside") {
		const metrics = measureWrappedText(text, font);
		return [
			`shape ${shape} ${width}x${height ?? "-"}`,
			`lines ${metrics.lines}`,
			`text ${round(metrics.width)}x${round(metrics.height)}`,
			`note: shape ${shape} draws its label outside the box; the box size does not constrain the text`,
		].join("\n");
	}

	// Every outline but rect is eaten into from top and bottom as well, so without a
	// height this would measure a box nobody specified. rect alone allows omitting
	// it, since its height does not bear on the content width.
	if (shape !== "rect" && height === undefined) {
		return `error: height is required for shape ${shape}`;
	}

	const box = resolution.rect;
	const metrics = measureWrappedText(text, font, box.width);
	// The wrap width is only exceeded when a single character is wider than the box.
	// A rounding difference of 0.5px is tolerated.
	const fits =
		metrics.width <= box.width + 0.5 &&
		(height === undefined || metrics.height <= box.height);

	return [
		`shape ${shape} ${width}x${height ?? "-"}`,
		`lines ${metrics.lines}`,
		`text ${round(metrics.width)}x${round(metrics.height)}`,
		`content ${round(box.width)}x${height === undefined ? "-" : round(box.height)}`,
		`fits ${fits ? "yes" : "no"}`,
	].join("\n");
}

/** What a tool can return: text, and the PNG a capture returns */
type ToolContent =
	| { type: "text"; text: string }
	| { type: "image"; data: string; mimeType: string };

/** One tool call's reply */
type ToolReply = { content: ToolContent[] };

/** Build an MCP tool's return value (a single piece of text). */
function textResult(text: string): ToolReply {
	return { content: [{ type: "text", text }] };
}

/**
 * The shared path that runs a tool body and reduces an exception to text that can
 * be returned to the AI.
 *
 * CanvasFileError, CanvasHostError and DocOperationError are returned as they are
 * as user-facing messages; anything else is formatted as an internal error.
 */
async function runTool(
	handler: () => Promise<string>,
): Promise<ReturnType<typeof textResult>> {
	try {
		return textResult(await handler());
	} catch (error) {
		if (
			error instanceof CanvasFileError ||
			error instanceof CanvasHostError ||
			error instanceof DocOperationError
		) {
			return textResult(`error: ${error.message}`);
		}
		const reason = error instanceof Error ? error.message : String(error);
		return textResult(`internal error: ${reason}`);
	}
}

/**
 * The shared path for "load → modify → validated write-back".
 *
 * `mutate` modifies the document directly and returns the short summary handed
 * back to the AI.
 */
async function runMutation(
	withPathLock: PathLock,
	path: string,
	mutate: (doc: Awaited<ReturnType<typeof loadCanvasFile>>) => string,
): Promise<ReturnType<typeof textResult>> {
	return runTool(async () =>
		withPathLock(path, async () => {
			const doc = await loadCanvasFile(path);
			const summary = mutate(doc);
			await saveCanvasFile(path, doc);
			return summary;
		}),
	);
}
