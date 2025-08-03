class SimplexNoise {
  perm;
  grad3;
  constructor(seed) {
    this.grad3 = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    this.perm = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    if (seed !== void 0) {
      this.seedShuffle(p, seed);
    } else {
      this.randomShuffle(p);
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }
  /**
   * Generates 2D simplex noise for the given coordinates.
   * @param xin - The x-coordinate.
   * @param yin - The y-coordinate.
   * @returns A noise value in the range [-1, 1].
   */
  noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 8;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;
    n0 = this.calculateCornerContribution(gi0, x0, y0);
    n1 = this.calculateCornerContribution(gi1, x1, y1);
    n2 = this.calculateCornerContribution(gi2, x2, y2);
    return 70 * (n0 + n1 + n2);
  }
  calculateCornerContribution(gi, x, y) {
    let t = 0.5 - x * x - y * y;
    if (t < 0) {
      return 0;
    } else {
      t *= t;
      const g = this.grad3[gi];
      return t * t * (g[0] * x + g[1] * y);
    }
  }
  seedShuffle(array, seed) {
    let random = this.seededRandom(seed);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  randomShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

export { SimplexNoise };
