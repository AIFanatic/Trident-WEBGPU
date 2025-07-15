export declare class SimplexNoise {
    private perm;
    private grad3;
    constructor(seed?: number);
    /**
     * Generates 2D simplex noise for the given coordinates.
     * @param xin - The x-coordinate.
     * @param yin - The y-coordinate.
     * @returns A noise value in the range [-1, 1].
     */
    noise2D(xin: number, yin: number): number;
    private calculateCornerContribution;
    private seedShuffle;
    private randomShuffle;
    private seededRandom;
}
//# sourceMappingURL=SimplexNoise.d.ts.map