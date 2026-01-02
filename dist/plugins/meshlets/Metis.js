import Module from './metis-5.2.1/Metis.js';
import { WASMPointer, WASMHelper } from './WASMHelper.js';

class Metis {
  static METIS;
  static isLoaded = false;
  static async load() {
    if (!Metis.METIS) {
      Metis.METIS = await Module();
      this.isLoaded = true;
    }
  }
  static partition(groups, nparts) {
    if (!this.isLoaded) throw Error("Metis library not loaded");
    function _prepare_graph(adjacency) {
      function assert(condition) {
        if (!condition) throw Error("assert");
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
    const objval = new WASMPointer(new Uint32Array(1), "out");
    const parts = new WASMPointer(new Uint32Array(_xadj.length - 1), "out");
    const options_array = new Int32Array(40);
    options_array.fill(-1);
    options_array[16 /* METIS_OPTION_UFACTOR */] = 200;
    WASMHelper.call(
      Metis.METIS,
      "METIS_PartGraphKway",
      "number",
      new WASMPointer(new Int32Array([_xadj.length - 1])),
      // nvtxs
      new WASMPointer(new Int32Array([1])),
      // ncon
      new WASMPointer(new Int32Array(_xadj)),
      // xadj
      new WASMPointer(new Int32Array(_adjncy)),
      // adjncy
      null,
      // vwgt
      null,
      // vsize
      null,
      // adjwgt
      new WASMPointer(new Int32Array([nparts])),
      // nparts
      null,
      // tpwgts
      null,
      // ubvec
      new WASMPointer(options_array),
      // options
      objval,
      // objval
      parts
      // part
    );
    const part_num = Math.max(...parts.data);
    const parts_out = [];
    for (let i = 0; i <= part_num; i++) {
      const part = [];
      for (let j = 0; j < parts.data.length; j++) {
        if (parts.data[j] === i) {
          part.push(j);
        }
      }
      if (part.length > 0) parts_out.push(part);
    }
    return parts_out;
  }
  static rebuildMeshletsFromGroupIndices(meshlets, groups) {
    let groupedMeshlets = [];
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
  static group(adj, nparts) {
    const groups = this.partition(adj, nparts);
    return groups;
  }
  // METIS_API(int) METIS_PartGraphRecursive(idx_t *nvtxs, idx_t *ncon, idx_t *xadj, 
  //     idx_t *adjncy, idx_t *vwgt, idx_t *vsize, idx_t *adjwgt, 
  //     idx_t *nparts, real_t *tpwgts, real_t *ubvec, idx_t *options, 
  //     idx_t *edgecut, idx_t *part);
  static METIS_PartGraphRecursive(nvtxs, ncon, xadj, adjncy, vwgt, vsize, adjwgt, nparts, tpwgts, ubvec, options, edgecut, part) {
    const parts = new WASMPointer(new Int32Array([...part]), "out");
    const r = WASMHelper.call(
      Metis.METIS,
      "METIS_PartGraphRecursive",
      "number",
      nvtxs ? new WASMPointer(new Int32Array([nvtxs])) : null,
      // nvtxs
      ncon ? new WASMPointer(new Int32Array([ncon])) : null,
      // ncon
      xadj ? new WASMPointer(new Int32Array([...xadj])) : null,
      // xadj
      adjncy ? new WASMPointer(new Int32Array([...adjncy])) : null,
      // adjncy
      vwgt ? new WASMPointer(new Int32Array([vwgt])) : null,
      // vwgt
      vsize ? new WASMPointer(new Int32Array([vsize])) : null,
      // vsize
      adjwgt ? new WASMPointer(new Int32Array([...adjwgt])) : null,
      // adjwgt
      nparts ? new WASMPointer(new Int32Array([nparts])) : null,
      // nparts
      tpwgts ? new WASMPointer(new Float32Array([...tpwgts])) : null,
      // tpwgts
      ubvec ? new WASMPointer(new Int32Array([ubvec])) : null,
      // ubvec
      options ? new WASMPointer(new Int32Array([...options])) : null,
      // options
      edgecut ? new WASMPointer(new Int32Array([edgecut])) : null,
      // objval
      parts
      // part
    );
    for (let i = 0; i < parts.data.length; i++) part[i] = parts.data[i];
    return r;
  }
}

export { Metis };
