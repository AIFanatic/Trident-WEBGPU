// import * as METIS from "./metis-5.1.0/Metis.js";
import * as METIS from "./metis-5.2.1/Metis.js";
import { WASMHelper, WASMPointer } from "./WASMHelper.js";
export var METIS_OPTIONS;
(function (METIS_OPTIONS) {
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_PTYPE"] = 0] = "METIS_OPTION_PTYPE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_OBJTYPE"] = 1] = "METIS_OPTION_OBJTYPE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_CTYPE"] = 2] = "METIS_OPTION_CTYPE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_IPTYPE"] = 3] = "METIS_OPTION_IPTYPE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_RTYPE"] = 4] = "METIS_OPTION_RTYPE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_DBGLVL"] = 5] = "METIS_OPTION_DBGLVL";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NITER"] = 6] = "METIS_OPTION_NITER";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NCUTS"] = 7] = "METIS_OPTION_NCUTS";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_SEED"] = 8] = "METIS_OPTION_SEED";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NO2HOP"] = 9] = "METIS_OPTION_NO2HOP";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_MINCONN"] = 10] = "METIS_OPTION_MINCONN";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_CONTIG"] = 11] = "METIS_OPTION_CONTIG";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_COMPRESS"] = 12] = "METIS_OPTION_COMPRESS";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_CCORDER"] = 13] = "METIS_OPTION_CCORDER";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_PFACTOR"] = 14] = "METIS_OPTION_PFACTOR";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NSEPS"] = 15] = "METIS_OPTION_NSEPS";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_UFACTOR"] = 16] = "METIS_OPTION_UFACTOR";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NUMBERING"] = 17] = "METIS_OPTION_NUMBERING";
    /* Used for command-line parameter purposes */
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_HELP"] = 18] = "METIS_OPTION_HELP";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_TPWGTS"] = 19] = "METIS_OPTION_TPWGTS";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NCOMMON"] = 20] = "METIS_OPTION_NCOMMON";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_NOOUTPUT"] = 21] = "METIS_OPTION_NOOUTPUT";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_BALANCE"] = 22] = "METIS_OPTION_BALANCE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_GTYPE"] = 23] = "METIS_OPTION_GTYPE";
    METIS_OPTIONS[METIS_OPTIONS["METIS_OPTION_UBVEC"] = 24] = "METIS_OPTION_UBVEC";
})(METIS_OPTIONS || (METIS_OPTIONS = {}));
;
export var METIS_RETURN_CODES;
(function (METIS_RETURN_CODES) {
    METIS_RETURN_CODES[METIS_RETURN_CODES["METIS_OK"] = 1] = "METIS_OK";
    METIS_RETURN_CODES[METIS_RETURN_CODES["METIS_ERROR_INPUT"] = -2] = "METIS_ERROR_INPUT";
    METIS_RETURN_CODES[METIS_RETURN_CODES["METIS_ERROR_MEMORY"] = -3] = "METIS_ERROR_MEMORY";
    METIS_RETURN_CODES[METIS_RETURN_CODES["METIS_ERROR"] = -4] = "METIS_ERROR";
})(METIS_RETURN_CODES || (METIS_RETURN_CODES = {}));
export class Metis {
    static METIS;
    static isLoaded = false;
    static async load() {
        if (!Metis.METIS) {
            Metis.METIS = await METIS.default();
            this.isLoaded = true;
        }
    }
    static partition(groups, nparts) {
        if (!this.isLoaded)
            throw Error("Metis library not loaded");
        // From: pymetis
        function _prepare_graph(adjacency) {
            function assert(condition) {
                if (!condition)
                    throw Error("assert");
            }
            let xadj = [0];
            let adjncy = [];
            for (let i = 0; i < adjacency.length; i++) {
                let adj = adjacency[i];
                if (adj !== null && adj.length) {
                    assert(Math.max(...adj) < adjacency.length);
                }
                adjncy.push(...adj);
                xadj.push(adjncy.length);
            }
            return [xadj, adjncy];
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
        WASMHelper.call(Metis.METIS, "METIS_PartGraphKway", "number", new WASMPointer(new Int32Array([_xadj.length - 1])), // nvtxs
        new WASMPointer(new Int32Array([1])), // ncon
        new WASMPointer(new Int32Array(_xadj)), // xadj
        new WASMPointer(new Int32Array(_adjncy)), // adjncy
        null, // vwgt
        null, // vsize
        null, // adjwgt
        new WASMPointer(new Int32Array([nparts])), // nparts
        null, // tpwgts
        null, // ubvec
        new WASMPointer(options_array), // options
        objval, // objval
        parts);
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
        const parts_out = [];
        for (let i = 0; i <= part_num; i++) {
            const part = [];
            for (let j = 0; j < parts.data.length; j++) {
                if (parts.data[j] === i) {
                    part.push(j);
                }
            }
            if (part.length > 0)
                parts_out.push(part);
        }
        return parts_out;
    }
    static rebuildMeshletsFromGroupIndices(meshlets, groups) {
        let groupedMeshlets = [];
        for (let i = 0; i < groups.length; i++) {
            if (!groupedMeshlets[i])
                groupedMeshlets[i] = [];
            for (let j = 0; j < groups[i].length; j++) {
                const meshletId = groups[i][j];
                const meshlet = meshlets[meshletId];
                groupedMeshlets[i].push(meshlet);
            }
        }
        return groupedMeshlets;
    }
    static group(adj, nparts) {
        const groups = this.partition(adj, nparts);
        return groups;
    }
    // METIS_API(int) METIS_PartGraphRecursive(idx_t *nvtxs, idx_t *ncon, idx_t *xadj, 
    //     idx_t *adjncy, idx_t *vwgt, idx_t *vsize, idx_t *adjwgt, 
    //     idx_t *nparts, real_t *tpwgts, real_t *ubvec, idx_t *options, 
    //     idx_t *edgecut, idx_t *part);
    static METIS_PartGraphRecursive(nvtxs, ncon, xadj, adjncy, vwgt, vsize, adjwgt, nparts, tpwgts, ubvec, options, edgecut, part) {
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
        const r = WASMHelper.call(Metis.METIS, "METIS_PartGraphRecursive", "number", nvtxs ? new WASMPointer(new Int32Array([nvtxs])) : null, // nvtxs
        ncon ? new WASMPointer(new Int32Array([ncon])) : null, // ncon
        xadj ? new WASMPointer(new Int32Array([...xadj])) : null, // xadj
        adjncy ? new WASMPointer(new Int32Array([...adjncy])) : null, // adjncy
        vwgt ? new WASMPointer(new Int32Array([vwgt])) : null, // vwgt
        vsize ? new WASMPointer(new Int32Array([vsize])) : null, // vsize
        adjwgt ? new WASMPointer(new Int32Array([...adjwgt])) : null, // adjwgt
        nparts ? new WASMPointer(new Int32Array([nparts])) : null, // nparts
        tpwgts ? new WASMPointer(new Float32Array([...tpwgts])) : null, // tpwgts
        ubvec ? new WASMPointer(new Int32Array([ubvec])) : null, // ubvec
        options ? new WASMPointer(new Int32Array([...options])) : null, // options
        edgecut ? new WASMPointer(new Int32Array([edgecut])) : null, // objval
        parts // part
        );
        for (let i = 0; i < parts.data.length; i++)
            part[i] = parts.data[i];
        return r;
    }
}
