// The jiscribe command line: a thin mouth on @jiscribe/doc-tools, so a person, a
// CI job and an AI agent all get the same answers about a .jis that the
// editor would give. The checking commands print one finding per line and take
// --json for the same content as one object.
//
// `render` is the exception to "headless": it drives a real browser over the real
// Canvas, which is what makes the image faithful. It is also the only command
// that loads playwright, and it does so on demand — every other command runs with
// no browser on the machine. `preview` reaches the same canvas the other way round:
// it writes it into a file for a browser elsewhere to run.
//
// `tools` / `op` / `guide` are jiscribe-mcp's document editing from a shell: the
// same ai-tools declarations, so a tool's name, arguments and reply are the
// ones the MCP server gives. `op` prints a JSON report by default, being read
// by programs more than by people, and takes --text for lines.

import { runCheckCommand } from "./checkCommand";
import { runGuideCommand } from "./guideCommand";
import { runMeasureCommand } from "./measureCommand";
import { runOpCommand } from "./opCommand";
import { runPreviewCommand } from "./previewCommand";
import { runRenderCommand } from "./renderCommand";
import { runToolsCommand } from "./toolsCommand";

const USAGE = `usage: jiscribe <command> [options]

  validate <files...>   read the document with the canvas parser and report what it found
                        [--json]
  diagnose <files...>   validate, then report text that overflows the shape holding it
                        [--json]
  measure  <text>       report how the text lays out in a given box
                        --width <px> --font-size <px> [--bold] [--shape <type> --height <px>] [--json]
  render   <file>       draw the document to a .png or .svg (needs a Chromium-based browser)
                        -o <out.png|out.svg> [--scale <n>] [--region content|viewbox]
                        [--background <css color>] [--browser <channel|path>]
  preview  <file>       write the document into one HTML file that draws it in a real canvas
                        -o <out.html>
  tools    [<tool>]     list the editing tools, or show one's description and argument schema
                        [--json]
  op       <file> <tool>
                        run one editing tool on the file, writing it back if it changed
                        [--args <json | @path | ->] [--create] [--text]
  op       <file> --batch <@path | ->
                        run a JSON array of { tool, args?, as? } in order; all or nothing
                        [--create] [--text]
  guide    <drawing | json-format>
                        print the guide to drawing with the tools, or to the file format

Options are per command; each prints its own usage when its arguments are malformed.
Globs are left to the shell: jiscribe validate diagrams/**/*.jis
`;

const run = async (argv: readonly string[]): Promise<number> => {
	const [command, ...rest] = argv;
	switch (command) {
		case "validate":
			return runCheckCommand(rest, false);
		case "diagnose":
			return runCheckCommand(rest, true);
		case "measure":
			return runMeasureCommand(rest);
		case "render":
			return runRenderCommand(rest);
		case "preview":
			return runPreviewCommand(rest);
		case "tools":
			return runToolsCommand(rest);
		case "op":
			return runOpCommand(rest);
		case "guide":
			return runGuideCommand(rest);
		case "--help":
		case "-h":
		case undefined:
			process.stdout.write(USAGE);
			return command === undefined ? 2 : 0;
		default:
			process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
			return 2;
	}
};

process.exitCode = await run(process.argv.slice(2));
