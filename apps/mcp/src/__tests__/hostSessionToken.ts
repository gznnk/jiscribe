import http from "node:http";

/**
 * Reads the token a canvas host hands out, the way the viewer's page does before
 * every connect.
 *
 * It goes through node:http rather than fetch because these tests start one host
 * after another on the same port: fetch keeps its connection pooled, and the next
 * host inherits a socket the previous one has already cut.
 *
 * @param hostUrl The host's own URL, as CanvasHost.url gives it
 * @returns The token every write and every WebSocket URL has to carry
 */
export async function readSessionToken(hostUrl: string): Promise<string> {
	return await new Promise<string>((resolve, reject) => {
		const request = http.get(
			`${hostUrl}/api/session`,
			{ agent: false },
			(response) => {
				let body = "";
				response.setEncoding("utf8");
				response.on("data", (chunk: string) => {
					body += chunk;
				});
				response.on("end", () => {
					if (response.statusCode !== 200) {
						reject(
							new Error(
								`the host refused to hand out a token: ${String(response.statusCode)}`,
							),
						);
						return;
					}
					resolve((JSON.parse(body) as { token: string }).token);
				});
			},
		);
		request.on("error", reject);
	});
}
