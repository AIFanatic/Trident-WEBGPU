import { Utils } from "../utils/Utils";

import { Vector3 } from "../math/Vector3";
import { Triangle } from "../plugins/HalfEdge/Triangle";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Renderer } from "../renderer/Renderer";
import { METIS_OPTIONS, Metis } from "../plugins/meshlets/Metis";
import { MeshletGrouper } from "../plugins/meshlets/utils/MeshletGrouper";
import { Meshoptimizer, attribute_size } from "../plugins/meshlets/Meshoptimizer";
import { MeshletCreator } from "../plugins/meshlets/utils/MeshletCreator";
import { MeshletMerger } from "../plugins/meshlets/utils/MeshletMerger";
import { FQMR } from "../plugins/meshlets/FQMR";
import FastQuadric from "../plugins/FastQuadric/FastQuadric";
import { WASMHelper, WASMPointer } from "../plugins/meshlets/WASMHelper";
import { loadModel } from "../plugins/GLTF2/gltf";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function get(url: string) {
    return fetch(url).then(response => response.text());
}


function drawLine(ctx: CanvasRenderingContext2D, from: Vertex2D, to: Vertex2D, color: string, width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
}

function colorParse(color: number | string) {
    let c = "black";
    if (typeof color === "string") c = color;
    else c = "#" + Math.floor(Math.abs(color)).toString(16).padStart(6, '0').slice(0,6);
    return c + "50";    
}

function drawTriangle(ctx: CanvasRenderingContext2D, triangle: Triangle, color: number | string, strokeColor: number | string = "black") {
    ctx.fillStyle = colorParse(color);
    ctx.strokeStyle = colorParse(strokeColor);

    ctx.beginPath();
    ctx.moveTo(triangle.a.x, triangle.a.y);
    ctx.lineTo(triangle.b.x, triangle.b.y);
    ctx.lineTo(triangle.c.x, triangle.c.y);
    ctx.lineTo(triangle.a.x, triangle.a.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
}

function drawCircle(ctx: CanvasRenderingContext2D, position: Vertex2D, radius: number, color: string) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, 180 / Math.PI);
    ctx.stroke();
    ctx.closePath();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, position: Vertex2D, size: number, color: string | number) {
    ctx.fillStyle = colorParse(color);
    ctx.font = `${size}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(text, position.x, position.y);
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Vertex2D, to: Vertex2D) {
    var headlen = 10; // length of head in pixels
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fill();
    ctx.closePath();
}


interface Vertex2D {
    x: number;
    y: number;
};

interface PathTriangle {
    a: Vertex2D;
    b: Vertex2D;
    c: Vertex2D;
}

interface Path {
    triangles: PathTriangle[];
    color: string;
}

async function Application() {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const treeSVG = await get("./assets/research/tree-0.svg");
    const container = document.createElement("div");
    container.innerHTML = treeSVG;
    const paths = container.children.item(0)?.children;
    if (!paths) throw Error("No paths");

    const triangles: Path[] = [];
    const zoom: Vertex2D = { x: 3, y: 3 };

    for (const path of paths) {
        const pathD = path.getAttribute("d");
        const pathColor = path.getAttribute("fill");
        if (!pathD) continue;
        if (!pathColor) continue;

        const trianglesStr = Utils.StringFindAllBetween(pathD, "M ", " Z");

        const pathTriangles: Path = { color: pathColor, triangles: [] };
        for (const triangleStr of trianglesStr) {
            const trianglesStrArr = triangleStr.split(" ");

            const triangle: PathTriangle = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, c: { x: 0, y: 0 } };

            for (let i = 0; i < trianglesStrArr.length; i++) {
                if (i >= 3) throw Error("No triangle has more than 3 sides");
                const vertexStrArr = trianglesStrArr[i].split(",");
                if (vertexStrArr.length > 2) throw Error("Expecting 2D vertices");
                const x = parseFloat(vertexStrArr[0]);
                const y = parseFloat(vertexStrArr[1]);
                if (i === 0) {
                    triangle.a = { x: x * zoom.x, y: y * zoom.y };
                }
                if (i === 1) {
                    triangle.b = { x: x * zoom.x, y: y * zoom.y };
                }
                if (i === 2) {
                    triangle.c = { x: x * zoom.x, y: y * zoom.y };
                }
            }

            pathTriangles.triangles.push(triangle);
        }
        triangles.push(pathTriangles);
    }

    // Draw paths
    for (const pathTriangles of triangles) {
        for (const triangle of pathTriangles.triangles) {
            drawTriangle(ctx, triangle, pathTriangles.color);
        }
    }



    function getVerticesAndIndices(triangles: PathTriangle[]) {
        const k = (v: number[]) => `${v[0]},${v[1]},${v[2]}`;
        let vertexMap: string[] = [];
        let points: number[][] = [];
        let trisByIndex: number[][] = [];

        for (const triangle of triangles) {
            const vs = [triangle.a, triangle.b, triangle.c];
    
            for (let i = 0; i < vs.length; i++) {
                const p3d = [vs[i].x, vs[i].y, 0];
    
                const key = k(p3d);
                if (!vertexMap.includes(key)) {
                    points.push([
                        p3d[0], p3d[1], 0, // vertex
                        0, 0, 0, // normal
                        0, 0 // uv
                    ]);
                    vertexMap.push(key);
                }
            }
    
            const ai = vertexMap.indexOf(k([triangle.a.x, triangle.a.y, 0]));
            const bi = vertexMap.indexOf(k([triangle.b.x, triangle.b.y, 0]));
            const ci = vertexMap.indexOf(k([triangle.c.x, triangle.c.y, 0]));
    
            trisByIndex.push([ai, bi, ci]);
        }
        return {vertices: new Float32Array(points.flat()), indices: new Uint32Array(trisByIndex.flat())};
    }

    function drawMeshlet(ctx: CanvasRenderingContext2D, meshlet: Meshlet, color: number | string, strokeColor?: number | string) {
        for (let i = 0; i < meshlet.indices.length; i+=3) {
            const a = meshlet.indices[i + 0];
            const b = meshlet.indices[i + 1];
            const c = meshlet.indices[i + 2];
            const v1 = new Vector3(meshlet.vertices[a * attribute_size + 0], meshlet.vertices[a * attribute_size + 1], meshlet.vertices[a * attribute_size + 2]);
            const v2 = new Vector3(meshlet.vertices[b * attribute_size + 0], meshlet.vertices[b * attribute_size + 1], meshlet.vertices[b * attribute_size + 2]);
            const v3 = new Vector3(meshlet.vertices[c * attribute_size + 0], meshlet.vertices[c * attribute_size + 1], meshlet.vertices[c * attribute_size + 2]);
            const t = new Triangle(v1,v2,v3);
            drawTriangle(ctx, t, color, strokeColor)
        }
    }


    let canvases: HTMLCanvasElement[] = [];
    let ctxs: CanvasRenderingContext2D[] = [];
    for (let i = 0; i < 5; i++) {
        const _canvas = document.createElement("canvas");
        _canvas.width = canvas.width;
        _canvas.height = canvas.height;
        _canvas.style.width = canvas.style.width;
        _canvas.style.height = canvas.style.height;
        document.body.appendChild(_canvas);
        const _ctx = _canvas.getContext('2d') as CanvasRenderingContext2D;
        ctxs.push(_ctx);
        
    }


    const webgpuCanvas = document.createElement("canvas");
    const tridentRenderer = Renderer.Create(webgpuCanvas, "webgpu");

    class Random {
        private static seed = 0;
        public static random(): number {
            this.seed++;
            return Math.sin(this.seed * 0.1224112);
        }
        public static rand(co: number) {
            function fract(n) {
                return n % 1;
            }
    
            return fract(Math.sin((co + 1) * 12.9898) * 43758.5453);
        }
    }

    await Meshoptimizer.load();
    await Metis.load();
    await FQMR.load();

    let meshlets: Meshlet[] = [];
    for(const path of triangles) {
        const verticesIndices = getVerticesAndIndices(path.triangles);
        const meshlet = new Meshlet(verticesIndices.vertices, verticesIndices.indices);
        meshlets.push(meshlet);
    }




    function generateADJ(meshlet: Meshlet, nparts: number) {
        // Assuming indices is an array of numbers (unsigned integers)
        const indices: number[] = Array.from(meshlet.indices); // Replace with your actual indices array
        console.log("indices", indices)

        // Initialize shadowib as a copy of indices
        const shadowib: number[] = indices.slice();

        // Function to create a unique key for a pair of numbers
        function makeEdgeKey(a: number, b: number): string {
            return `${a},${b}`;
        }

        // Map to store edges with their corresponding triangle index
        const edges = new Map<string, number>();

        for (let i = 0; i < indices.length; ++i) {
            const v0 = shadowib[i + 0];
            const v1 = shadowib[i + (i % 3 === 2 ? -2 : 1)];

            // We don't track adjacency fully on non-manifold edges for now
            const key = makeEdgeKey(v0, v1);
            edges.set(key, Math.floor(i / 3));
        }

        const triadj: number[] = new Array(indices.length).fill(-1);

        for (let i = 0; i < indices.length; i += 3) {
            const v0 = shadowib[i + 0];
            const v1 = shadowib[i + 1];
            const v2 = shadowib[i + 2];

            const oab = edges.get(makeEdgeKey(v1, v0));
            const obc = edges.get(makeEdgeKey(v2, v1));
            const oca = edges.get(makeEdgeKey(v0, v2));

            triadj[i + 0] = oab !== undefined ? oab : -1;
            triadj[i + 1] = obc !== undefined ? obc : -1;
            triadj[i + 2] = oca !== undefined ? oca : -1;
        }

        const triidx: number[] = new Array(indices.length / 3);
        for (let i = 0; i < indices.length; i += 3) {
            triidx[i / 3] = i / 3;
        }



        const xadj = new Array(triidx.length + 1).fill(0);
        const adjncy = new Array();
    
        for (let i = 0; i < triidx.length; i++) {
            for (let j = 0; j < 3; j++) if (triadj[i * 3 + j] != -1) adjncy.push(triadj[i * 3 + j]);
    
            xadj[i + 1] = adjncy.length;
        }

        console.log("triadj", triadj);
        console.log("triidx", triidx);
        console.log("xadj", xadj);




        const nvtxs = new WASMPointer(new Int32Array([triidx.length]), "in");
        const ncon = new WASMPointer(new Int32Array([1]));
        const _xadj = new WASMPointer(new Int32Array(xadj));
        const _adjncy = new WASMPointer(new Int32Array(adjncy));
        const _nparts = new WASMPointer(new Int32Array([nparts]));

        const objval = new WASMPointer(new Uint32Array(1), "out");
        const parts = new WASMPointer(new Uint32Array(triidx.length), "out");

        const options_array = new Int32Array(40);
        options_array.fill(-1);

        options_array[METIS_OPTIONS.METIS_OPTION_UFACTOR] = 200;

        
        WASMHelper.call(Metis.METIS, "METIS_PartGraphKway", "number", 
            nvtxs, // nvtxs
            ncon,                // ncon
            _xadj,            // xadj
            _adjncy,          // adjncy
            null,                                              // vwgt
            null,                                              // vsize
            null,                                              // adjwgt
            _nparts,           // nparts
            null,                                              // tpwgts
            null,                                              // ubvec
            new WASMPointer(options_array),                    // options
            objval,                                            // objval
            parts,                                             // part
        )

        // let partsize = new Array(16).fill(0);
        // let partoff = new Array(parts.data.length).fill(0);
        // for (let i = 0; i < parts.data.length; i++) {
        //     partoff[i] = partsize[parts.data[i]]++;
        // }
        // console.log(partsize, partoff)




        // let parts_out: number[][] = [];
        // for (let p = 0; p < 16; ++p)
        // {
        //     let partidx: number[] = [];
        //     let partadj: number[] = [];
    
        //     for (let i = 0; i < triidx.length; ++i)
        //     {
        //         if (parts.data[i] != p)
        //             continue;
    
        //         partidx.push(triidx[i]);
    
        //         for (let j = 0; j < 3; ++j)
        //         {
        //             if (triadj[i * 3 + j] >= 0 && parts.data[triadj[i * 3 + j]] == p)
        //                 partadj.push(partoff[triadj[i * 3 + j]]);
        //             else
        //                 partadj.push(-1);
        //         }
        //     }

        //     parts_out.push(partidx)
        // }

    //     console.log(parts_out)

    //    let meshlets: Meshlet[] = [];
    //     for (let i = 0; i < parts_out.length; i++) {
    //         const part = parts_out[i];
    //         const m = new Meshlet(meshlet.vertices, new Uint32Array(part));
    //         meshlets.push(m);
    //     }
    //     console.log(meshlets)
    //     return meshlets;

        
    
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
        // console.log(parts_out)
        console.log(parts_out, Math.min(...parts_out.flat()))


        // let meshlets: Meshlet[] = [];
        // for (let i = 0; i < parts_out.length; i++) {
        //     const part = parts_out[i];
        //     console.log(part)

        //     let indices: number[] = [];
        //     for (let j = 0; j < part.length; j++) {
        //         const index = part[j];
                
        //     }
        // }

        console.log(parts_out)
        return [new Meshlet(meshlet.vertices, new Uint32Array(parts_out[0]))];
        // return MeshletGrouper.partitionMeshByMetisOutput(meshlet.vertices, meshlet.indices, parts_out)
    }

    const merged = MeshletMerger.merge(meshlets);

    const npartsFirst = Math.ceil(merged.indices.length / 3 / 128);
    // const bigMeshlet = generateADJ(merged, npartsFirst);

    // // **** MeshletCreator.build is not building contiguous meshlets!!!! ****
    // const bigMeshlet = MeshletCreator.build(merged.vertices, merged.indices, 255, 128);
    const bigMeshlet = MeshletGrouper.split(merged, npartsFirst);
    console.log(bigMeshlet.length)

    

    for (let i = 0; i < bigMeshlet.length; i++) {
        const c = Random.rand(i * 12212.2123) * 0xffffff;
        drawMeshlet(ctxs[0], bigMeshlet[i], c);
    }

    for (let i = 0; i < bigMeshlet.length; i++) {
        drawText(ctxs[0], i, {x: bigMeshlet[i].boundingVolume.center.x, y: bigMeshlet[i].boundingVolume.center.y}, 20, "red")
    }


    const nparts = 4;
    const groups = MeshletGrouper.group(bigMeshlet, nparts);
    console.log(nparts, groups)

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const merged = MeshletMerger.merge(group);
        const cleaned = Meshoptimizer.clean(merged);
        const c = Random.rand(i * 12212.2123) * 0xffffff;
        drawMeshlet(ctxs[1], cleaned, c);

        let simplified = Meshoptimizer.meshopt_simplify(cleaned, cleaned.indices.length / 2, 1);
        // const simplified2 = FQMR.setSimplifyRebuilt(cleaned, cleaned.indices.length / 3 / 2, true, true);
        // const f = new FastQuadric();
        // const simplified3 = f.simplifyMeshlet(cleaned);
        // console.log(
        //     cleaned.indices.length / 3,
        //     simplified.meshlet.indices.length / 3,
        //     simplified2.indices.length / 3,
        //     simplified3.indices.length / 3
        // )
        
        
        // simplified = {meshlet: simplified2, error: 1};



        drawMeshlet(ctxs[2], simplified.meshlet, c);


        const splits = MeshletGrouper.split(simplified.meshlet, 2);
        console.log("splits", nparts, group.length, splits)
        for (let j = 0; j < splits.length; j++) {
            const cs = Random.rand((j * 1223.33 + i * 12.121) * 12212.2123) * 0xffffff;
            drawMeshlet(ctxs[3], splits[j], cs);
        }

        // break;
    }

    // for (let i = 0; i < groups.length; i++) {
    //     const group = groups[i];
    //     const merged = MeshletMerger.merge(group);
    //     // const c = Random.rand(i * 12212.2123) * 0xffffff;
    //     drawText(ctxs[1], i, {x: merged.boundingVolume.center.x, y: merged.boundingVolume.center.y}, 20, "red")
    // }

};

Application();