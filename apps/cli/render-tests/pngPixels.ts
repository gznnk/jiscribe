import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

/** A decoded image: the pixel grid and how many bytes each pixel takes. */
export type DecodedPng = {
	width: number;
	height: number;
	/** 3 for truecolour, 4 when an alpha channel is present. */
	channels: number;
	/** Row-major samples, `channels` bytes per pixel, already un-filtered. */
	pixels: Buffer;
};

/** Bytes of the `IHDR` fields this decoder reads, at their offsets in the chunk body. */
const parseHeader = (body: Buffer) => ({
	width: body.readUInt32BE(0),
	height: body.readUInt32BE(4),
	depth: body[8],
	colorType: body[9],
	interlace: body[12],
});

/**
 * Decodes a PNG far enough to compare two of them. Handles what the canvas's
 * own export writes and nothing more: 8 bits per sample, truecolour with or
 * without alpha, no interlacing. Reaching for an image library instead would put
 * a dependency into the CLI for the sake of its tests alone.
 *
 * @param file - Path of the PNG to read
 * @returns The pixel grid; the `iTXt` source chunk and every other ancillary chunk is skipped
 * @throws When the file uses a bit depth, colour type or interlacing this decoder does not cover
 */
export const readPng = (file: string): DecodedPng => {
	const buffer = readFileSync(file);
	let offset = 8;
	let header: ReturnType<typeof parseHeader> | null = null;
	const dataChunks: Buffer[] = [];
	while (offset < buffer.length) {
		const length = buffer.readUInt32BE(offset);
		const type = buffer.toString("ascii", offset + 4, offset + 8);
		const body = buffer.subarray(offset + 8, offset + 8 + length);
		if (type === "IHDR") {
			header = parseHeader(body);
		} else if (type === "IDAT") {
			dataChunks.push(body);
		} else if (type === "IEND") {
			break;
		}
		offset += length + 12;
	}
	if (header === null) {
		throw new Error(`${file} carries no IHDR chunk`);
	}
	if (header.depth !== 8 || header.interlace !== 0) {
		throw new Error(`${file}: unsupported PNG ${JSON.stringify(header)}`);
	}
	const channels = header.colorType === 6 ? 4 : header.colorType === 2 ? 3 : 0;
	if (channels === 0) {
		throw new Error(`${file}: unsupported colour type ${header.colorType}`);
	}

	const raw = inflateSync(Buffer.concat(dataChunks));
	const { width, height } = header;
	const stride = width * channels;
	const pixels = Buffer.alloc(stride * height);
	let previous = Buffer.alloc(stride);
	// Each row is prefixed by its filter type and is decoded against the row above
	// it, so the rows have to be walked in order (PNG spec, 9.2).
	for (let y = 0; y < height; y += 1) {
		const filter = raw[y * (stride + 1)];
		const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
		const row = pixels.subarray(y * stride, (y + 1) * stride);
		for (let x = 0; x < stride; x += 1) {
			const left = x >= channels ? row[x - channels] : 0;
			const up = previous[x];
			const upLeft = x >= channels ? previous[x - channels] : 0;
			let value = line[x];
			if (filter === 1) {
				value += left;
			} else if (filter === 2) {
				value += up;
			} else if (filter === 3) {
				value += (left + up) >> 1;
			} else if (filter === 4) {
				const predicted = left + up - upLeft;
				const toLeft = Math.abs(predicted - left);
				const toUp = Math.abs(predicted - up);
				const toUpLeft = Math.abs(predicted - upLeft);
				value +=
					toLeft <= toUp && toLeft <= toUpLeft
						? left
						: toUp <= toUpLeft
							? up
							: upLeft;
			}
			row[x] = value & 0xff;
		}
		previous = row;
	}
	return { width, height, channels, pixels };
};

/** Rec. 709 luminance of the pixel starting at `index`, on the 0..255 scale. */
const luminance = (image: DecodedPng, index: number): number =>
	0.2126 * image.pixels[index] +
	0.7152 * image.pixels[index + 1] +
	0.0722 * image.pixels[index + 2];

/**
 * How many pixels the two images disagree on, comparing brightness rather than
 * the three channels separately: the drawing is dark ink on a light ground, so a
 * difference that matters is a difference in how dark a pixel came out.
 *
 * @param expected - One image; the two must already be the same size
 * @param actual - The other image
 * @param threshold - Luminance distance a pair may be apart before it counts, on the 0..255 scale
 * @returns The count of pixels further apart than `threshold`
 * @throws When the two differ in size, which is a mismatch no per-pixel count can describe
 */
export const countDifferingPixels = (
	expected: DecodedPng,
	actual: DecodedPng,
	threshold: number,
): number => {
	if (expected.width !== actual.width || expected.height !== actual.height) {
		throw new Error(
			`size mismatch: ${expected.width}x${expected.height} vs ${actual.width}x${actual.height}`,
		);
	}
	let differing = 0;
	for (let pixel = 0; pixel < expected.width * expected.height; pixel += 1) {
		const distance = Math.abs(
			luminance(expected, pixel * expected.channels) -
				luminance(actual, pixel * actual.channels),
		);
		if (distance > threshold) {
			differing += 1;
		}
	}
	return differing;
};
