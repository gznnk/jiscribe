import * as vscode from "vscode";

import {
	buildImageResolvedMessage,
	resolveDocImageContent,
} from "./docImageResolution";
import type { ExtensionToWebviewMessage } from "../types/messages";

/**
 * Answer the Webview's "resolveImage" request: read the file an `image` shape
 * names and post its bytes back (the handler body for that message).
 *
 * The bytes go over postMessage as base64 instead of as an `asWebviewUri`, so
 * the Webview needs neither a localResourceRoots entry nor a CSP `img-src`
 * relaxation. Failures are reported to the Webview as `ok: false` rather than
 * thrown, so this Promise never rejects.
 *
 * @param post - the panel's channel to its Webview (`CanvasWebviewChannel.post`); the answer goes through it so the bridge registry sees it like every other message
 * @param documentUri - URI of the edited document; its folder is what `src` is relative to
 * @param requestId - the id the Webview sent, echoed back so it can match the answer
 * @param src - the raw `src` string from the doc (see resolveDocImageContent for the rule it must follow)
 */
export const resolveDocImage = async (
	post: (message: ExtensionToWebviewMessage) => void,
	documentUri: vscode.Uri,
	requestId: string,
	src: string,
): Promise<void> => {
	// Composing the URI inside the reader keeps a throw from it (an untitled or
	// otherwise root-less document) inside resolveDocImageContent's catch, where it
	// becomes ok: false like any other unreadable file
	const content = await resolveDocImageContent(src, async (segments) =>
		vscode.workspace.fs.readFile(
			vscode.Uri.joinPath(documentUri, "..", ...segments),
		),
	);
	try {
		post(buildImageResolvedMessage(requestId, content));
	} catch {
		// The Webview was disposed while the file was being read, so there is nobody
		// left to answer
	}
};
