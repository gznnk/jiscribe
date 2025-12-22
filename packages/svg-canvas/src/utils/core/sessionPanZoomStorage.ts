import type { SvgCanvasPanZoom } from "../../canvas/types/SvgCanvasPanZoom";

export type SessionPanZoomSaver = (pz: SvgCanvasPanZoom) => void;

const key = (uuid: string) => `svg-canvas:panzoom:${uuid}`;

const throttle = (fn: (pz: SvgCanvasPanZoom) => void, wait = 150) => {
	let last = 0;
	return (pz: SvgCanvasPanZoom) => {
		const now = Date.now();
		if (now - last >= wait) {
			last = now;
			fn(pz);
		}
	};
};

export const createSessionPanZoomSaver = (
	uuid: string,
	wait = 200,
): SessionPanZoomSaver =>
	throttle((pz: SvgCanvasPanZoom) => {
		sessionStorage.setItem(key(uuid), JSON.stringify(pz));
	}, wait);

export const loadSessionPanZoom = (uuid: string): SvgCanvasPanZoom | null => {
	const raw = sessionStorage.getItem(key(uuid));
	return raw ? (JSON.parse(raw) as SvgCanvasPanZoom) : null;
};

export const clearSessionPanZoom = (uuid: string): void => {
	sessionStorage.removeItem(key(uuid));
};
