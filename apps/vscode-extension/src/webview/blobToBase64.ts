/**
 * Blob → base64 encoding, extracted from index.tsx so the save path
 * (exportViaCanvasHandle) and the export dialog's handler share one encoder.
 */

/**
 * Encodes a Blob's bytes as base64.
 *
 * @param blob - the bytes to encode; its MIME type does not reach the result,
 *   as the data-URL header FileReader produces is stripped off
 * @returns the base64 text; rejects with the FileReader's error when the read
 *   fails
 */
export const blobToBase64 = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve((reader.result as string).split(",")[1] ?? "");
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
