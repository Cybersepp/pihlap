import type { CSSProperties } from 'react';

const MOBILE_WIDTH = 768;
const MOBILE_HEIGHT = 640;
// Above this width we treat the viewport as a desktop even if it's short and
// touch-capable — this keeps touchscreen laptops/monitors out of mobile layout.
const LANDSCAPE_PHONE_MAX_WIDTH = 950;
const MENUBAR_HEIGHT = 28;
const WINDOW_PADDING = 32;
const QT_TITLEBAR_HEIGHT = 38;
const QT_VIDEO_TARGET_VIEWPORT_FRACTION = 0.8;
const QT_VIDEO_MIN_VIEWPORT_FRACTION = 1 / 3;

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

// Whether the browser can actually give us a WebGL context. The whole site is one
// WebGL scene, so if this is false (old device, blocked/soft-disabled GL, headless
// bot) we render the DOM fallback instead of a blank canvas. Result is cached — the
// answer can't change within a session, and creating a probe context isn't free.
let _webglCache: boolean | null = null;
export function isWebGLAvailable(): boolean {
  if (_webglCache !== null) return _webglCache;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    _webglCache = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    _webglCache = false;
  }
  return _webglCache;
}

export function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };
}

export function shouldUseMobileLayout(): boolean {
  const { width, height } = getViewportSize();
  // Phone-width (portrait) viewport — always mobile.
  if (width < MOBILE_WIDTH) return true;
  // Landscape phone: short AND touch AND not as wide as a desktop monitor. The
  // width cap is what keeps wide touchscreen desktops/laptops on desktop layout.
  if (isTouchDevice() && height < MOBILE_HEIGHT && width < LANDSCAPE_PHONE_MAX_WIDTH) return true;
  // Everything wider (incl. touchscreen desktops) uses the desktop layout/poses.
  return false;
}

export function clampWindowSize(width: number, height: number) {
  const { width: vw, height: vh } = getViewportSize();
  const maxW = vw - WINDOW_PADDING;
  const maxH = vh - MENUBAR_HEIGHT - WINDOW_PADDING;
  return {
    width: Math.min(width, maxW),
    height: Math.min(height, maxH),
  };
}

export function getPopupWindowStyle(width: number, height: number): CSSProperties {
  const clamped = clampWindowSize(width, height);
  return {
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    width: clamped.width,
    height: clamped.height,
    maxWidth: `calc(100vw - ${WINDOW_PADDING}px)`,
    maxHeight: `calc(100vh - ${MENUBAR_HEIGHT}px - ${WINDOW_PADDING}px)`,
  };
}

export function getQuickTimeLayout(maxVideoWidthCap: number) {
  const { width: vw, height: vh } = getViewportSize();
  const maxWindowW = vw - WINDOW_PADDING;
  const maxWindowH = vh - MENUBAR_HEIGHT - WINDOW_PADDING;
  const maxVideoWidth = Math.min(maxVideoWidthCap, maxWindowW);

  const targetVideoHeight = Math.round(vh * QT_VIDEO_TARGET_VIEWPORT_FRACTION);
  const minVideoHeight = Math.round(vh * QT_VIDEO_MIN_VIEWPORT_FRACTION);
  const maxVideoHeight = maxWindowH - QT_TITLEBAR_HEIGHT;

  let videoHeight = Math.min(targetVideoHeight, maxVideoHeight);
  videoHeight = Math.max(minVideoHeight, videoHeight);

  let videoWidth = Math.round(videoHeight * (16 / 9));
  if (videoWidth > maxVideoWidth) {
    videoWidth = maxVideoWidth;
    videoHeight = Math.round(videoWidth * (9 / 16));
  }

  // Window fits the video exactly — titlebar + 16:9 video, nothing else.
  const clamped = {
    width: Math.min(videoWidth, maxWindowW),
    height: Math.min(QT_TITLEBAR_HEIGHT + videoHeight, maxWindowH),
  };
  const bodyHeight = clamped.height - QT_TITLEBAR_HEIGHT;

  return {
    clamped,
    bodyHeight,
    videoHeight,
    videoWidth,
    windowStyle: getPopupWindowStyle(clamped.width, clamped.height),
  };
}
