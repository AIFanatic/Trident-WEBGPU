import { Utils } from "../utils/Utils";



import { Vector3 } from "../math/Vector3";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from "three";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { Geometry, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { HalfedgeDS } from "../plugins/HalfEdge/HalfEdgeDS";
import { Color } from "../math/Color";
import { Triangle } from "../plugins/HalfEdge/Triangle";
import { Halfedge } from "../plugins/HalfEdge/HalfEdge";
import { Vertex } from "../plugins/HalfEdge/Vertex";

window.global = {};
// import * as poly2tri from 'poly2tri';

var poly2tri = require('poly2tri');


async function main() {
    const bunny = await OBJLoaderIndexed.load("./assets/suzanne.obj");
    console.log(bunny)

    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(bunny.vertices, 3));
    g.setIndex(new Uint32BufferAttribute(bunny.indices, 3));

    console.log(g);
    const nonIndexed = g.toNonIndexed();
    const merged = mergeVertices(nonIndexed);
    console.log(merged)
    // return

    // const vertices2 = mesh.positions.buffer.data;
    // const indices2 = mesh.indices.data;

    // const vertices2 = bunny.vertices;
    // const indices2 = bunny.indices;

    const vertices2 = merged.getAttribute("position").array;
    const indices2 = merged.getIndex().array as Uint32Array;

    // return;

    let vStr = "";
    for (let i = 0; i < vertices2.length; i += 3) {
        const x = vertices2[i + 0];
        const y = vertices2[i + 1];
        const z = vertices2[i + 2];
        vStr += `${x.toPrecision(6)} ${y.toPrecision(6)} ${z.toPrecision(6)}\n`;
    }

    let iStr = "";
    for (let i = 0; i < indices2.length; i += 3) {
        const x = indices2[i + 0];
        const y = indices2[i + 1];
        const z = indices2[i + 2];
        iStr += `3 ${x} ${y} ${z}\n`;
    }

    const meshOFF = `OFF\n${vertices2.length / 3} ${indices2.length / 3} 0\n${vStr}${iStr}`;
    console.log(meshOFF)
}
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

function drawTriangle(ctx: CanvasRenderingContext2D, triangle: Triangle, color: string) {
    ctx.fillStyle = color;
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


    const path = triangles[0].triangles;
    console.log(path)
    // const geometry = pa

    const vertices: number[] = [];
    for (const triangle of path) {
        vertices.push(triangle.a.x, triangle.a.y, 0);
        vertices.push(triangle.b.x, triangle.b.y, 0);
        vertices.push(triangle.c.x, triangle.c.y, 0);
    }

    const verticesF = new Float32Array(vertices);
    console.log(verticesF)

    const webgpuCanvas = document.createElement("canvas");
    const renderer = Renderer.Create(webgpuCanvas, "webgpu");

    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(verticesF));
    console.log(geometry)

    const halfEdgeMesh = new HalfedgeDS();
    halfEdgeMesh.setFromGeometry(geometry);
    console.log(halfEdgeMesh)





    function drawHalfMesh(ctx: CanvasRenderingContext2D, halfMesh: HalfedgeDS, offset: Vertex2D = {x: 0, y: 0}, mouse?: Vertex2D) {
        const normal = new Vector3();
        const dir = new Vector3();
        const pos = new Vector3();
        const arrowHeadLDir = new Vector3();
        const arrowHeadRDir = new Vector3();
        const cross = new Vector3();
        const vertices2 = new Array<number>();
        const colors = new Array<number>();
        const tip = new Vector3();
      
        const arrowSize = 0.015;
        const crossGapFactor = 0.03;
        const dirGapFactor = 0.15;
        const normalGapFactor = 0.01
        
        const loops = halfMesh.loops();
    
        let verts = 0;
        for (const loophe of loops) {
            for (const halfedge of loophe.nextLoop()) {
                const start = halfedge.vertex.position;
                const end = halfedge.twin.vertex.position;

                // dir.subVectors(end, start);
                // cross.copy(normal).cross(dir);
    
                // dir.mul(dirGapFactor);
                // normal.mul(normalGapFactor);
                // cross.mul(crossGapFactor);
    
    
                // // start
                // pos.copy(start).add(normal).add(cross).add(dir);
                // vertices2.push(pos.x, pos.y, pos.z);
    
                // // end
                // tip.copy(end).add(normal).add(cross).sub(dir);
                // vertices2.push(tip.x, tip.y, tip.z);
    
    
                // vertices2.push(start.x, start.y, start.z);
                // vertices2.push(end.x, end.y, end.z);


                const zoom = {x: 2, y: 2};
                const from: Vertex2D = {x: (start.x + offset.x) * zoom.x, y: (start.y + offset.y) * zoom.y};
                const to: Vertex2D = {x: (end.x + offset.x) * zoom.x, y: (end.y + offset.y) * zoom.y};


                let color = halfedge.isBoundary() || halfedge.twin.isBoundary() ? "red" : "green";

                const face = halfedge.face ?? halfedge.twin.face;

                if (face) {
                    function findCentroid(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
                        return new Vector3(
                            (v1.x + v2.x + v3.x) / 3,
                            (v1.y + v2.y + v3.y) / 3,
                            (v1.z + v2.z + v3.z) / 3
                        );
                    }

                    const t = new Triangle()
                    t.set(
                        halfedge.prev.vertex.position,
                        halfedge.vertex.position,
                        halfedge.next.vertex.position
                    );
                    if (mouse && t.containsPoint(new Vector3(mouse.x / window.devicePixelRatio, mouse.y / window.devicePixelRatio, 0))) {
                        color = "yellow";
                    }

                    const center = findCentroid(t.a, t.b, t.c);

                    const p = {x: center.x + offset.x, y: center.y + offset.y};
                    // drawCircle(ctx, p, 1, "red");
                    const id = halfMesh.halfedges.indexOf(halfedge);
                    // drawText(ctx, `${id}`, p, 10, "red");

                    // drawTriangle(ctx, t, "red");
                }

                if (mouse && halfedge.containsPoint(new Vector3(mouse.x / window.devicePixelRatio, mouse.y / window.devicePixelRatio, 0), 1)) {
                    color = "yellow";
                }
                drawLine(ctx, from, to, color, 1);

                verts += 2;
            }
    
        }
    }

    function GetClosestHalfEdgeToMouse(halfMesh: HalfedgeDS, mouse: Vertex2D): Halfedge | null {
        const loops = halfMesh.loops();
        for (const loophe of loops) {
            for (const halfedge of loophe.nextLoop()) {
                if (mouse && halfedge.containsPoint(new Vector3(mouse.x / window.devicePixelRatio, mouse.y / window.devicePixelRatio, 0), 1)) {
                    return halfedge;
                }
            }
        }

        return null;
    }



    // halfEdgeMesh.removeEdge(halfEdgeMesh.halfedges[50], true);

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


    drawHalfMesh(ctxs[0], halfEdgeMesh);

    // halfEdgeMesh.collpaseEdge(halfEdgeMesh.halfedges[100], 0.5);
    for (let i = 10; i < 11; i++) {
        halfEdgeMesh.collpaseEdge(halfEdgeMesh.halfedges[i], 0.5);
        
    }

    let mouse: Vertex2D = {x: 0, y: 0};
    let isMousePressed = false;
    ctxs[1].canvas.addEventListener("mousemove", event => {
        mouse.x = event.offsetX * devicePixelRatio;
        mouse.y = event.offsetY * devicePixelRatio;
    })

    ctxs[1].canvas.addEventListener("mousedown", event => isMousePressed = true);
    ctxs[1].canvas.addEventListener("mouseup", event => isMousePressed = false);
    function render() {
        ctxs[1].clearRect(0, 0, ctxs[1].canvas.width, ctxs[1].canvas.height);
        drawHalfMesh(ctxs[1], halfEdgeMesh, {x: 0, y: 0}, mouse);


        drawCircle(ctxs[1], mouse, 5, "red");

        const closest = GetClosestHalfEdgeToMouse(halfEdgeMesh, mouse);
        if (closest && isMousePressed) {
            // console.log(closest, isMousePressed);
            // halfEdgeMesh.removeVertex(closest)
            halfEdgeMesh.collpaseEdge(closest, 0.5);
            // halfEdgeMesh.rebuild();
        }




        setTimeout(() => {
            render();
        }, 100);
    }

    // render();

    const loops = halfEdgeMesh.loops();
    
    let vertexMap: string[] = [];
    let countours: poly2tri.IPointLike[] = [];
    let points: poly2tri.IPointLike[] = [];
    let pointsVertexMap: Vertex[] = [];
    let i = 0;
    for (const loophe of loops) {
        for (const halfedge of loophe.nextLoop()) {
            if (!halfedge.isBoundary()) {
                if (!pointsVertexMap.includes(halfedge.vertex)) {
                    pointsVertexMap.push(halfedge.vertex);
                    points.push(new poly2tri.Point(halfedge.vertex.position.x, halfedge.vertex.position.y));
                }
                continue;
            }

            const start = halfedge.vertex.position;
            const end = halfedge.twin.vertex.position;

            function k(v: Vector3): string {
                return `${v._x},${v._y},${v._z}`;
            }

            if (!vertexMap.includes(k(start))) {
                vertexMap.push(k(start));
                countours.push(new poly2tri.Point(start.x, start.y));
            }

            if (!vertexMap.includes(k(end))) {
                vertexMap.push(k(end));
                countours.push(new poly2tri.Point(end.x, end.y));
            }

            drawLine(ctxs[2], start, end, "blue");

            const mid = end.clone().add(start).mul(0.5);
            drawText(ctxs[2], i, {x: mid.x + Math.random() * 0.1, y: mid.y + Math.random() * 0.1}, 12, "red");
            i++;
        }
    }

    console.log(countours)
    countours.splice(0, 1);

    var swctx = new poly2tri.SweepContext(countours);
    swctx.addPoints(points);
    swctx.triangulate();

    const tris = swctx.getTriangles();
    console.log(tris)
    console.log(points)

    tris.forEach(function(t) {
        const a = t.getPoint(0);
        const b = t.getPoint(1);
        const c = t.getPoint(2);

        const tri = new Triangle(new Vector3(a.x, a.y, 0), new Vector3(b.x, b.y, 0), new Vector3(c.x, c.y, 0))
        drawTriangle(ctxs[3], tri, "green");
        // or t.getPoint(0), t.getPoint(1), t.getPoint(2)
    });


};

Application();