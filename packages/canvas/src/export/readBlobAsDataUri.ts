/**
 * Reads a blob as a `data:` URI (base64, with the blob's own media type).
 *
 * @param blob - Any blob; the media type is taken from `blob.type` and never guessed here, so one with an empty `type` yields the File API's substitute, `data:application/octet-stream;base64,…` — a host reading a file is the one to attach the real type (`resolveDocImageMimeType` in `@jiscribe/doc`)
 * @returns The whole blob as one string; rejects when the read fails or yields something other than a string (a FileReader handed a detached blob)
 */
export const readBlobAsDataUri = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
				return;
			}
			reject(new Error("FileReader did not yield a data URI string"));
		};
		reader.onerror = () => {
			reject(reader.error ?? new Error("FileReader failed to read the blob"));
		};
		reader.readAsDataURL(blob);
	});
