// The jiscribe command line: a thin mouth on @jiscribe/doc-tools, so a person, a
// CI job and an AI agent all get the same answers about a .jis.json that the
// editor would give. Every command prints one finding per line and takes --json
// for the same content as one object.
//
// `render` is the exception to "headless": it drives a real browser over the real
// Canvas, which is what makes the image faithful. It is also the only command
// that loads playwright, and it does so on demand — the other four run with no
// browser on the machine. `preview` reaches the same canvas the other way round:
// it writes it into a file for a browser elsewhere to run.

import { runCheckCommand } from "./checkCommand";
import { runMeasureCommand } from "./measureCommand";
import { runPreviewCommand } from "./previewCommand";
import { runRenderCommand } from "./renderCommand";

const USAGE = `usage: jiscribe <command> [options]

  validate <files...>   check against the official JSON schema and the canvas parser
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

Options are per command; run one with no arguments for its own usage.
Globs are left to the shell: jiscribe validate diagrams/**/*.jis.json
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
