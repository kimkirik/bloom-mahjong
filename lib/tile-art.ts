// The painted atlases are not evenly spaced grids. Crop each row at its real
// whitespace boundary so a flower from the next row never appears on a tile.
const size = 1254;
const secondAtlas = [
  [0, 0, 320, 313], [321, 0, 633, 313], [637, 0, 940, 313], [943, 0, 1254, 313],
  [0, 316, 322, 620], [329, 316, 625, 620], [635, 316, 941, 620], [945, 316, 1254, 620],
  [0, 626, 317, 916], [320, 626, 623, 916], [627, 626, 934, 916], [937, 626, 1254, 916],
  [0, 918, 321, 1254], [324, 918, 629, 1254], [631, 918, 936, 1254], [939, 918, 1254, 1254],
];
export function tileArtStyle(type: number) {
  const n = type % 16;
  const xs = [0, 315, 628, 939, 1254], ys = [0, 316, 630, 942, 1254];
  const column = n % 4, row = Math.floor(n / 4);
  const [left, top, right, bottom] = type < 16
    ? [xs[column], ys[row], xs[column + 1], ys[row + 1]] : secondAtlas[n];
  const width = right - left, height = bottom - top;
  return {
    backgroundImage: `url(/tiles-${type < 16 ? 1 : 2}.png)`,
    backgroundSize: `${size / width * 100}% ${size / height * 100}%`,
    backgroundPosition: `${left / (size - width) * 100}% ${top / (size - height) * 100}%`,
  };
}
