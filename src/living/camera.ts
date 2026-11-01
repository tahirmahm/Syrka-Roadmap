export type SceneCamera = {
  x: number;
  y: number;
  zoom: number;
  width?: number;
  height?: number;
};
/** Preserve the world point at the viewport centre across an inspector or device resize. */
export function resizedCamera(
  camera: SceneCamera,
  width: number,
  height: number,
) {
  const w = camera.width || width,
    h = camera.height || height;
  return {
    x: width / 2 - (w / 2 - camera.x),
    y: height / 2 - (h / 2 - camera.y),
    zoom: camera.zoom,
    width,
    height,
  };
}
