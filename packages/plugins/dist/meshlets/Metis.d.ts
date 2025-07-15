import { Meshlet } from "./Meshlet.js";
export declare enum METIS_OPTIONS {
    METIS_OPTION_PTYPE = 0,
    METIS_OPTION_OBJTYPE = 1,
    METIS_OPTION_CTYPE = 2,
    METIS_OPTION_IPTYPE = 3,
    METIS_OPTION_RTYPE = 4,
    METIS_OPTION_DBGLVL = 5,
    METIS_OPTION_NITER = 6,
    METIS_OPTION_NCUTS = 7,
    METIS_OPTION_SEED = 8,
    METIS_OPTION_NO2HOP = 9,
    METIS_OPTION_MINCONN = 10,
    METIS_OPTION_CONTIG = 11,
    METIS_OPTION_COMPRESS = 12,
    METIS_OPTION_CCORDER = 13,
    METIS_OPTION_PFACTOR = 14,
    METIS_OPTION_NSEPS = 15,
    METIS_OPTION_UFACTOR = 16,
    METIS_OPTION_NUMBERING = 17,
    METIS_OPTION_HELP = 18,
    METIS_OPTION_TPWGTS = 19,
    METIS_OPTION_NCOMMON = 20,
    METIS_OPTION_NOOUTPUT = 21,
    METIS_OPTION_BALANCE = 22,
    METIS_OPTION_GTYPE = 23,
    METIS_OPTION_UBVEC = 24
}
export declare enum METIS_RETURN_CODES {
    METIS_OK = 1,
    METIS_ERROR_INPUT = -2,
    METIS_ERROR_MEMORY = -3,
    METIS_ERROR = -4
}
export declare class Metis {
    private static METIS;
    private static isLoaded;
    static load(): Promise<void>;
    static partition(groups: number[][], nparts: number): number[][];
    static rebuildMeshletsFromGroupIndices(meshlets: Meshlet[], groups: number[][]): Meshlet[][];
    static group(adj: number[][], nparts: number): number[][];
    static METIS_PartGraphRecursive(nvtxs: number, ncon: number, xadj: number[], adjncy: number[], vwgt: any, vsize: any, adjwgt: number[], nparts: number, tpwgts: number[], ubvec: any, options: number[], edgecut: number, part: number[]): METIS_RETURN_CODES;
}
//# sourceMappingURL=Metis.d.ts.map