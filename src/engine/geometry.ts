// Verbatim Illustrator coordinates. The last vertex closes the polygon.
export const ARROW_POINTS =
  "1355.57 540.12 611.81 825.65 25.46 1050.7 401.49 540.12 25.46 29.48 611.76 254.58 1355.57 540.12";
export const VIEWBOX = { width: 1379.91, height: 1080 };
export const VERTICES = [
  [1355.57, 540.12],
  [611.81, 825.65],
  [25.46, 1050.7],
  [401.49, 540.12],
  [25.46, 29.48],
  [611.76, 254.58],
];
export const TRIANGLES = [0, 1, 3, 1, 2, 3, 0, 3, 5, 3, 4, 5];
export function arrowVertices(): Float32Array {
  return new Float32Array(
    TRIANGLES.flatMap((i) => [
      (VERTICES[i][0] - VIEWBOX.width / 2) / VIEWBOX.width,
      (VERTICES[i][1] - VIEWBOX.height / 2) / VIEWBOX.width,
    ]),
  );
}
export const pathData = `M${ARROW_POINTS.split(" ")
  .reduce<string[]>((a, n, i) => {
    if (i % 2 === 0) a.push(n);
    else a[a.length - 1] += ` ${n}`;
    return a;
  }, [])
  .join(" L")}Z`;
