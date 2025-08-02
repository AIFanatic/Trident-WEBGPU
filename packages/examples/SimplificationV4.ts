import { Utils } from "../utils/Utils";



import { Vector3 } from "../math/Vector3";
import { Triangle } from "../plugins/HalfEdge/Triangle";

import cdt2d from "cdt2d";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import FastQuadric from "../plugins/FastQuadric/FastQuadric";

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";


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

function drawTriangle(ctx: CanvasRenderingContext2D, triangle: Triangle, color: string, fill = true) {
    ctx.fillStyle = color;
    // ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(triangle.a.x, triangle.a.y);
    ctx.lineTo(triangle.b.x, triangle.b.y);
    ctx.lineTo(triangle.c.x, triangle.c.y);
    ctx.lineTo(triangle.a.x, triangle.a.y);
    if (fill) ctx.fill();
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

function drawText(ctx: CanvasRenderingContext2D, text: string, position: Vertex2D, size: number, color: string) {
    ctx.fillStyle = color;
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


    const path = triangles[2].triangles;
    console.log(path)
    // const geometry = pa

    let canvases: HTMLCanvasElement[] = [];
    let ctxs: CanvasRenderingContext2D[] = [];
    for (let i = 0; i < 5; i++) {
        const w = 350;
        const h = 350;
        const _canvas = document.createElement("canvas");
        const aspectRatio = window.devicePixelRatio;
        _canvas.width = w * aspectRatio;
        _canvas.height = h * aspectRatio;
        _canvas.style.width = `${w}px`;
        _canvas.style.height = `${h}px`;
        document.body.appendChild(_canvas);
        const _ctx = _canvas.getContext('2d') as CanvasRenderingContext2D;
        ctxs.push(_ctx);

    }

    const k = (v: number[]) => `${v[0]},${v[1]},${v[2]}`;

    let vertexMap: string[] = [];

    let points: number[][] = [];
    let trisByIndex: number[][] = [];
    for (const triangle of path) {
        const a = new Vector3(triangle.a.x, triangle.a.y, 0);
        const b = new Vector3(triangle.b.x, triangle.b.y, 0);
        const c = new Vector3(triangle.c.x, triangle.c.y, 0);
        const t = new Triangle(a, b, c);
        drawTriangle(ctxs[0], t, "red");

        const vs = [triangle.a, triangle.b, triangle.c];

        for (let i = 0; i < vs.length; i++) {
            const p3d = [vs[i].x, vs[i].y, 0];

            const key = k(p3d);
            if (!vertexMap.includes(key)) {
                points.push([p3d[0], p3d[1], 0]);
                vertexMap.push(key);
            }
        }

        const ai = vertexMap.indexOf(k([triangle.a.x, triangle.a.y, 0]));
        const bi = vertexMap.indexOf(k([triangle.b.x, triangle.b.y, 0]));
        const ci = vertexMap.indexOf(k([triangle.c.x, triangle.c.y, 0]));

        trisByIndex.push([ai, bi, ci]);
    }

    console.log("vertices", points)
    console.log("tris", trisByIndex);


    const webgpuCanvas = document.createElement("canvas");
    const renderer = Renderer.Create(webgpuCanvas, "webgpu");
    
    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(points.flat())));
    geometry.index = new IndexAttribute(new Uint32Array(trisByIndex.flat()));

    console.log(geometry)

    const f = new FastQuadric({
        targetPercentage: 0,
        aggressiveness: 1000000
    });
    f.simplify(geometry);

    // f.extraSimplify(0);
    // f.removeTriangle(16)
    // f.removeVertex(23);



    function drawPolygon(ctx, points, tris) {
        for (let i = 0; i < tris.length; i++) {
            const t = tris[i];
            const a = points[t[0]];
            const b = points[t[1]];
            const c = points[t[2]];
            // console.log(a,b,c)

            const tt = new Triangle(new Vector3(a[0], a[1], 0), new Vector3(b[0], b[1], 0), new Vector3(c[0], c[1], 0));
            drawTriangle(ctx, tt, "yellow", true);

            const v = new Vector3();
            tt.getMidpoint(v);

            drawText(ctx, i, {x: v.x, y: v.y}, 12, "black");
        }

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            drawCircle(ctx, {x: p[0], y: p[1]}, 5, "red");
            drawText(ctx, i, {x: p[0], y: p[1]}, 20, "red");
        }
    }

    const tris: number[][] = [];
    for (const t of f._triangles) {
        tris.push(t.v);
    }

    const points2: number[][] = [];
    for (const v of f._vertices) {
        points2.push([v.p.x, v.p.y, v.p.z]);
    }

    console.log(tris.length)
    drawPolygon(ctxs[1], points2, tris);




    // // Test
    // function THREEPass(vertices: number[][], triangles: number[][]): {points: number[][], triangles: number[][]} {
    //     let g = new THREE.BufferGeometry();
    //     g.setAttribute("position", new THREE.Float32BufferAttribute(vertices.flat(), 3));
    //     g.setIndex(new THREE.Uint32BufferAttribute(triangles.flat(), 3));
    //     g = g.toNonIndexed();

        

    //     // Remove vertices
    //     {
    //         let vout: number[] = [];

    //         let vremove = 6;
    //         let v = 0;
    //         const vs = g.getAttribute("position").array;
    //         for (let i = 0; i < vs.length; i+=3) {
    //             if (v !== vremove) {
    //                 vout.push(vs[i + 0], vs[i + 1], vs[i + 2])
    //             }
    //             v++;
    //         }

    //         // console.log(vs.length, vout.length)
    //         vout = Array.from(vs);
    //         vout.splice(0, 3);
    //         g.setAttribute("position", new THREE.Float32BufferAttribute(vout, 3));
    //     }
        
        

    //     g = mergeVertices(g);
    //     const vs = g.getAttribute("position").array;
    //     let outV: number[][] = [];
    //     for (let i = 0; i < vs.length; i+=3) outV.push([vs[i + 0], vs[i + 1], vs[i + 2]]);

    //     const is = g.getIndex().array;
    //     let outI: number[][] = [];
    //     for (let i = 0; i < is.length; i+=3) outI.push([is[i + 0], is[i + 1], is[i + 2]]);
        
        
    //     return {points: outV, triangles: outI};
    // }


    // const ret = THREEPass(points2, tris);
    // console.log(ret);

    // drawPolygon(ctxs[2], ret.points, ret.triangles);




    const vertices_meshlet_1 = [
        [-0.5, 0.5], [-0.6, 0.3], [-0.7, 0.1], [-0.8, -0.1], [-0.7, -0.3], [-0.5, -0.4], // left edge
        [-0.3, -0.5], [-0.1, -0.6], [0.1, -0.5], [0.3, -0.4], // bottom edge
        [0.4, -0.2], [0.5, 0], [0.4, 0.2], [0.3, 0.4], [0.1, 0.5], [-0.1, 0.6], // right edge
        [-0.3, 0.7], [-0.5, 0.7], [-0.7, 0.6], // top edge
        [-0.3, 0.2], [-0.5, 0.1], [-0.6, -0.1], [-0.4, -0.3], [-0.2, -0.3], [-0.1, -0.1], [0.1, -0.1], [0.2, 0.1], [0.1, 0.3]
    ]
    
    const indices_meshlet_1 = [
        [0, 1, 19], [1, 20, 19], [1, 2, 20], [2, 21, 20], [2, 3, 21],
        [3, 22, 21], [3, 4, 22], [4, 23, 22], [4, 5, 23], [5, 6, 23],
        [6, 7, 23], [7, 24, 23], [7, 8, 24], [8, 9, 24], [9, 25, 24],
        [9, 10, 25], [10, 26, 25], [10, 11, 26], [11, 27, 26], [11, 12, 27],
        [12, 28, 27], [12, 13, 28], [13, 14, 28], [14, 15, 28], [15, 16, 28],
        [16, 17, 28], [17, 18, 28], [18, 19, 28], [19, 20, 28], [20, 21, 28],
        [21, 22, 28], [22, 23, 28], [23, 24, 28], [24, 25, 28], [25, 26, 28],
        [26, 27, 28], [27, 28, 28], [28, 29, 28], [29, 30, 28]
    ]

    console.log(vertices_meshlet_1, indices_meshlet_1)
    drawPolygon(ctxs[2], vertices_meshlet_1, indices_meshlet_1);
    
    // // Vertices for purple meshlet (meshlet 2)
    // vertices_meshlet_2 = [
    //     [0.1, 0.6], [0.3, 0.5], [0.5, 0.4], [0.7, 0.3], [0.8, 0.1], # top right edge
    //     [0.8, -0.1], [0.7, -0.3], [0.5, -0.4], [0.3, -0.5], # bottom right edge
    //     [0.1, -0.6], [-0.1, -0.5], [-0.2, -0.3], [-0.1, -0.1], # bottom left to middle
    //     [0.1, 0.1], [0.3, 0.2], [0.5, 0.3], [0.6, 0.4], [0.7, 0.5], [0.6, 0.6], [0.5, 0.6], [0.3, 0.6]
    // ]
    
    // # Indices for purple meshlet
    // indices_meshlet_2 = [
    //     [0, 1, 13], [1, 14, 13], [1, 2, 14], [2, 15, 14], [2, 3, 15],
    //     [3, 16, 15], [3, 4, 16], [4, 17, 16], [4, 5, 17], [5, 18, 17],
    //     [5, 6, 18], [6, 19, 18], [6, 7, 19], [7, 20, 19], [7, 8, 20],
    //     [8, 21, 20], [8, 9, 21], [9, 22, 21], [9, 10, 22], [10, 23, 22],
    //     [10, 11, 23], [11, 24, 23], [11, 12, 24], [12, 25, 24], [12, 13, 25],
    //     [13, 14, 25], [14, 15, 25], [15, 16, 25], [16, 17, 25], [17, 18, 25],
    //     [18, 19, 25], [19, 20, 25], [20, 21, 25], [21, 22, 25], [22, 23, 25],
    //     [23, 24, 25], [24, 25, 25], [25, 26, 25], [26, 27, 25]
    // ]
    
    // # Vertices for green meshlet (meshlet 3)
    // vertices_meshlet_3 = [
    //     [0.1, 0], [0.3, 0.1], [0.4, 0.2], [0.5, 0.1], [0.4, -0.1], # middle right to top right edge
    //     [0.3, -0.3], [0.1, -0.4], [-0.1, -0.3], [-0.2, -0.1], # bottom right to middle
    //     [0, 0.1], [0.2, 0.3], [0.3, 0.4], [0.5, 0.3], [0.6, 0.1], [0.7, -0.1]
    // ]
    
    // # Indices for green meshlet
    // indices_meshlet_3 = [
    //     [0, 1, 10], [1, 2, 10], [2, 11, 10], [2, 3, 11], [3, 12, 11],
    //     [3, 4, 12], [4, 13, 12], [4, 5, 13], [5, 14, 13], [5, 6, 14],
    //     [6, 15, 14], [6, 7, 15], [7, 16, 15], [7, 8, 16], [8, 17, 16],
    //     [8, 9, 17], [9, 18, 17], [9, 10, 18], [10, 19, 18], [10, 11, 19],
    //     [11, 20, 19], [11, 12, 20], [12, 21, 20], [12, 13, 21], [13, 22, 21],
    //     [13, 14, 22], [14, 23, 22], [14, 15, 23], [15, 24, 23], [15, 16, 24],
    //     [16, 25, 24], [16, 17, 25], [17, 26, 25], [17, 18, 26], [18, 27, 26],
    //     [18, 19, 27], [19, 28, 27], [19, 20, 28], [20, 29, 28], [20, 21, 29],
    //     [21, 30, 29]
    // ]
    
};

Application();