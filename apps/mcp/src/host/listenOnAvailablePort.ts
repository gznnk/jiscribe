// Finding the host a port. The one it is given is a preference rather than a
// promise: another MCP process may already be serving a canvas on it, so a port
// that is taken is stepped over rather than being the end of it.

import type http from "node:http";

import { CanvasHostError } from "./canvasHostError";
import { isErrnoWithCode } from "../nodeErrors";

/** How many times to step one port up when the port is already in use */
const PORT_ATTEMPT_COUNT = 20;

/**
 * Tries to listen until a free port is found.
 *
 * @param server The HTTP server to listen with. It is left listening on the port
 *   returned, and a failure other than the port being taken is thrown as it is
 * @param startPort The port tried first. From there it steps up one at a time,
 *   over 20 ports in all
 * @returns The port it actually managed to listen on
 * @throws CanvasHostError When every port in that range is taken
 */
export const listenOnAvailablePort = async (
	server: http.Server,
	startPort: number,
): Promise<number> => {
	for (let offset = 0; offset < PORT_ATTEMPT_COUNT; offset += 1) {
		const port = startPort + offset;
		const isListening = await new Promise<boolean>((resolve, reject) => {
			const handleError = (error: unknown): void => {
				server.removeListener("listening", handleListening);
				if (isErrnoWithCode(error, "EADDRINUSE")) {
					resolve(false);
					return;
				}
				reject(error instanceof Error ? error : new Error(String(error)));
			};
			const handleListening = (): void => {
				server.removeListener("error", handleError);
				resolve(true);
			};
			server.once("error", handleError);
			server.once("listening", handleListening);
			server.listen(port, "127.0.0.1");
		});
		if (isListening) {
			return port;
		}
	}
	throw new CanvasHostError(
		`no free port in ${startPort}-${startPort + PORT_ATTEMPT_COUNT - 1}`,
	);
};
