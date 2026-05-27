import type { CSSProperties } from 'react';

const MOBILE_WIDTH = 768;
const MOBILE_HEIGHT = 640;
const MENUBAR_HEIGHT = 28;
const WINDOW_PADDING = 32;
const QT_TITLEBAR_HEIGHT = 38;
const QT_VIDEO_TARGET_VIEWPORT_FRACTION = 0.8;
const QT_VIDEO_MIN_VIEWPORT_FRACTION = 1 / 3;
const QT_META_MIN_HEIGHT = 80;

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
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
  const isSmallViewport = width < MOBILE_WIDTH || height < MOBILE_HEIGHT;
  return isSmallViewport && isTouchDevice();
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

export function getQuickTimeLayout(windowWidth: number, windowHeight: number) {
  const { width: vw, height: vh } = getViewportSize();
  const maxWindowW = vw - WINDOW_PADDING;
  const maxWindowH = vh - MENUBAR_HEIGHT - WINDOW_PADDING;
  const maxVideoWidth = Math.min(windowWidth, maxWindowW);

  const targetVideoHeight = Math.round(vh * QT_VIDEO_TARGET_VIEWPORT_FRACTION);
  const minVideoHeight = Math.round(vh * QT_VIDEO_MIN_VIEWPORT_FRACTION);
  const maxVideoHeight = maxWindowH - QT_TITLEBAR_HEIGHT - QT_META_MIN_HEIGHT;

  let videoHeight = Math.min(targetVideoHeight, maxVideoHeight);
  videoHeight = Math.max(minVideoHeight, videoHeight);

  let videoWidth = Math.round(videoHeight * (16 / 9));
  if (videoWidth > maxVideoWidth) {
    videoWidth = maxVideoWidth;
    videoHeight = Math.round(videoWidth * (9 / 16));
  }

  const fittedWindowHeight = QT_TITLEBAR_HEIGHT + videoHeight + QT_META_MIN_HEIGHT;
  const clamped = {
    width: Math.min(windowWidth, maxWindowW),
    height: Math.min(Math.max(windowHeight, fittedWindowHeight), maxWindowH),
  };

  const bodyHeight = clamped.height - QT_TITLEBAR_HEIGHT;
  const bodyVideoCap = bodyHeight - QT_META_MIN_HEIGHT;
  if (videoHeight > bodyVideoCap) {
    videoHeight = bodyVideoCap;
    videoWidth = Math.min(maxVideoWidth, Math.round(videoHeight * (16 / 9)));
    videoHeight = Math.round(videoWidth * (9 / 16));
  }

  return {
    clamped,
    bodyHeight,
    videoHeight,
    videoWidth,
    windowStyle: getPopupWindowStyle(clamped.width, clamped.height),
  };
}
