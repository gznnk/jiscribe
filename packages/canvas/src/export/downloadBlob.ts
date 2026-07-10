/** Triggers a download of the Blob via a temporary `<a>` element. */
export const downloadBlob = (blob: Blob, fileName: string): void => {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	// Revoke after the click has been fully handled
	setTimeout(() => URL.revokeObjectURL(url), 0);
};

/** Builds a `jiscribe-YYYYMMDD-HHmmss` timestamp name (without extension). */
export const buildTimestampedName = (): string => {
	const now = new Date();
	const pad = (value: number): string => String(value).padStart(2, "0");
	const stamp =
		`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
		`-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	return `jiscribe-${stamp}`;
};
