import { Meshlet } from "./Meshlet.js";
// import * as METIS from "./metis-5.1.0/Metis.js";
import * as METIS from "./metis-5.2.1/Metis.js";
import { WASMHelper, WASMPointer } from "./WASMHelper.js";

export enum METIS_OPTIONS {
    METIS_OPTION_PTYPE,
    METIS_OPTION_OBJTYPE,
    METIS_OPTION_CTYPE,
    METIS_OPTION_IPTYPE,
    METIS_OPTION_RTYPE,
    METIS_OPTION_DBGLVL,
    METIS_OPTION_NITER,
    METIS_OPTION_NCUTS,
    METIS_OPTION_SEED,
    METIS_OPTION_NO2HOP,
    METIS_OPTION_MINCONN,
    METIS_OPTION_CONTIG,
    METIS_OPTION_COMPRESS,
    METIS_OPTION_CCORDER,
    METIS_OPTION_PFACTOR,
    METIS_OPTION_NSEPS,
    METIS_OPTION_UFACTOR,
    METIS_OPTION_NUMBERING,
  
    /* Used for command-line parameter purposes */
    METIS_OPTION_HELP,
    METIS_OPTION_TPWGTS,
    METIS_OPTION_NCOMMON,
    METIS_OPTION_NOOUTPUT,
    METIS_OPTION_BALANCE,
    METIS_OPTION_GTYPE,
    METIS_OPTION_UBVEC
};

export enum METIS_RETURN_CODES {
    METIS_OK = 1,
    METIS_ERROR_INPUT = -2,
    METIS_ERROR_MEMORY = -3,
    METIS_ERROR = -4
}

export class Metis {
    private static METIS;
    private static isLoaded = false;

    public static async load() {
        if (!Metis.METIS) {
            Metis.METIS = await METIS.default();
            this.isLoaded = true;
        }
    }

    public static partition(groups: number[][], nparts: number): number[][] {
        if (!this.isLoaded) throw Error("Metis library not loaded");

        // From: pymetis
        function _prepare_graph(adjacency: number[][]) {
            function assert(condition: boolean) {
                if (!condition) throw Error("assert");
            }

            let xadj: number[] = [0]
            let adjncy: number[] = []

            for (let i = 0; i < adjacency.length; i++) {
                let adj = adjacency[i];
                if (adj !== null && adj.length) {
                    assert(Math.max(...adj) < adjacency.length)
                }
                adjncy.push(...adj);
                xadj.push(adjncy.length)
            }

            return [xadj, adjncy]
        }

        const [_xadj, _adjncy] = _prepare_graph(groups);

        // console.log("_xadj", _xadj);
        // console.log("_adjncy", _adjncy);
        // console.log("nparts", nparts);

        const objval = new WASMPointer(new Uint32Array(1), "out");
        const parts = new WASMPointer(new Uint32Array(_xadj.length - 1), "out");

        // console.log("_xadj", _xadj);
        // console.log("edge_weights", edge_weights);
        // throw Error("ERG")

        const options_array = new Int32Array(40);
        options_array.fill(-1);

        options_array[METIS_OPTIONS.METIS_OPTION_UFACTOR] = 200;
        // // options[METIS_OPTION_OBJTYPE] = 0;
        // // options[METIS_OPTION_CCORDER] = 1; 
        // // options[METIS_OPTION_NUMBERING] = 0;

        
        WASMHelper.call(Metis.METIS, "METIS_PartGraphKway", "number", 
            new WASMPointer(new Int32Array([_xadj.length - 1])), // nvtxs
            new WASMPointer(new Int32Array([1])),                // ncon
            new WASMPointer(new Int32Array(_xadj)),            // xadj
            new WASMPointer(new Int32Array(_adjncy)),          // adjncy
            null,                                              // vwgt
            null,                                              // vsize
            null,                                              // adjwgt
            new WASMPointer(new Int32Array([nparts])),           // nparts
            null,                                              // tpwgts
            null,                                              // ubvec
            new WASMPointer(options_array),                    // options
            objval,                                            // objval
            parts,                                             // part
        )

        // console.log("nvtxs", _xadj.length - 1);
        // console.log("ncon", 1);
        // console.log("xadj", _xadj);
        // console.log("adjncy", _adjncy);
        // console.log("vwgt", null);
        // console.log("vsize", null);
        // console.log("adjwgt", null);
        // console.log("nparts", nparts);
        // console.log("tpwgts", null);
        // console.log("ubvec", null);
        // console.log("_options", null);
        // console.log("objval", objval);
        // console.log("part", parts);
        // // nvtxs,
        // // ncon,
        // // xadj,
        // // adjncy,
        // // vwgt,
        // // vsize,
        // // adjwgt,
        // // nparts,
        // // tpwgts,
        // // ubvec,
        // // _options,
        // // objval,
        // // part,

        const part_num = Math.max(...parts.data);

        const parts_out: number[][] = [];
        for (let i = 0; i <= part_num; i++) {
            const part: number[] = [];

            for (let j = 0; j < parts.data.length; j++) {
                if (parts.data[j] === i) {
                    part.push(j);
                }
            }

            if (part.length > 0) parts_out.push(part);
        }

        return parts_out;
    }

    public static rebuildMeshletsFromGroupIndices(meshlets: Meshlet[], groups: number[][]): Meshlet[][] {
        let groupedMeshlets: Meshlet[][] = [];

        for (let i = 0; i < groups.length; i++) {
            if (!groupedMeshlets[i]) groupedMeshlets[i] = [];
            for (let j = 0; j < groups[i].length; j++) {
                const meshletId = groups[i][j];
                const meshlet = meshlets[meshletId];
                groupedMeshlets[i].push(meshlet);
            }
        }
        return groupedMeshlets;
    }

    public static group(adj: number[][], nparts: number): number[][] {
        const groups = this.partition(adj, nparts);
        return groups;
    }

    // METIS_API(int) METIS_PartGraphRecursive(idx_t *nvtxs, idx_t *ncon, idx_t *xadj, 
    //     idx_t *adjncy, idx_t *vwgt, idx_t *vsize, idx_t *adjwgt, 
    //     idx_t *nparts, real_t *tpwgts, real_t *ubvec, idx_t *options, 
    //     idx_t *edgecut, idx_t *part);

    public static METIS_PartGraphRecursive(
        nvtxs: number,
        ncon: number,
        xadj: number[],
        adjncy: number[],
        vwgt,
        vsize,
        adjwgt: number[],
        nparts: number,
        tpwgts: number[],
        ubvec,
        options: number[],
        edgecut: number,
        part: number[],
    ): METIS_RETURN_CODES {
        // console.log("nvtxs", nvtxs);
        // console.log("ncon", ncon);
        // console.log("xadj", xadj);
        // console.log("adjncy", adjncy);
        // console.log("vwgt", vwgt);
        // console.log("vsize", vsize);
        // console.log("adjwgt", adjwgt);
        // console.log("nparts", nparts);
        // console.log("tpwgts", tpwgts);
        // console.log("ubvec", ubvec);
        // console.log("options", options);
        // console.log("edgecut", edgecut);
        // console.log("part", part);

        const parts = new WASMPointer(new Int32Array([...part]), "out");
        const r = WASMHelper.call(Metis.METIS, "METIS_PartGraphRecursive", "number", 
            nvtxs ? new WASMPointer(new Int32Array([nvtxs])) : null, // nvtxs
            ncon ? new WASMPointer(new Int32Array([ncon])) : null,                // ncon
            xadj ? new WASMPointer(new Int32Array([...xadj])) : null,            // xadj
            adjncy ? new WASMPointer(new Int32Array([...adjncy])) : null,          // adjncy
            vwgt ? new WASMPointer(new Int32Array([vwgt])) : null,                                              // vwgt
            vsize ? new WASMPointer(new Int32Array([vsize])) : null,                                              // vsize
            adjwgt ? new WASMPointer(new Int32Array([...adjwgt])) : null,                                              // adjwgt
            nparts ? new WASMPointer(new Int32Array([nparts])) : null,           // nparts
            tpwgts ? new WASMPointer(new Float32Array([...tpwgts])) : null,                                              // tpwgts
            ubvec ? new WASMPointer(new Int32Array([ubvec])) : null,                                              // ubvec
            options ? new WASMPointer(new Int32Array([...options])) : null,                    // options
            edgecut ? new WASMPointer(new Int32Array([edgecut])) : null,                                            // objval
            parts                                            // part
        )
        for (let i = 0; i < parts.data.length; i++) part[i] = parts.data[i];

        return r;
    }
}