import { Utils } from "../utils/Utils";



import { Vector3 } from "../math/Vector3";
import { Triangle } from "../plugins/HalfEdge/Triangle";

import cdt2d from "cdt2d";


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


    const path = triangles[1].triangles;
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

    // Function to detect boundary edges from a list of triangles
    function getBoundaryEdges(triangles: number[][]): number[][] {
        // Map to count edge occurrences
        let edgeCount = new Map();

        // Iterate over each triangle
        for (let triangle of triangles) {
            // Get indices for the vertices of the triangle
            let idxA = triangle[0];
            let idxB = triangle[1];
            let idxC = triangle[2];

            // Define the edges of the triangle
            let edges = [
                [idxA, idxB],
                [idxB, idxC],
                [idxC, idxA],
            ];

            // Count occurrences of each edge
            for (let edge of edges) {
                // Create a key that is independent of edge direction
                let key = edge[0] < edge[1] ? `${edge[0]}-${edge[1]}` : `${edge[1]}-${edge[0]}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }

        // Collect boundary edges (edges that appear only once)
        let boundaryEdges = [];

        for (let [key, count] of edgeCount.entries()) {
            if (count === 1) {
                let indices = key.split('-').map(Number);
                boundaryEdges.push(indices);
            }
        }

        return boundaryEdges;
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
        drawTriangle(ctxs[1], t, "red");

        const vs = [triangle.a, triangle.b, triangle.c];

        for (let i = 0; i < vs.length; i++) {
            const p3d = [vs[i].x, vs[i].y, 0];

            const key = k(p3d);
            if (!vertexMap.includes(key)) {
                const pi = points.push([p3d[0], p3d[1]]);
                vertexMap.push(key);
            }
        }

        const ai = vertexMap.indexOf(k([triangle.a.x, triangle.a.y, 0]));
        const bi = vertexMap.indexOf(k([triangle.b.x, triangle.b.y, 0]));
        const ci = vertexMap.indexOf(k([triangle.c.x, triangle.c.y, 0]));

        trisByIndex.push([ai, bi, ci]);
    }

    console.log("vertexMap", vertexMap)
    console.log("tris", trisByIndex);

    console.log(points)

    let edges = getBoundaryEdges(trisByIndex);
    console.log("edges", edges)


    let mouse = { x: 0, y: 0 };
    let isMousePressed = false;
    let canDelete = false;
    ctxs[0].canvas.addEventListener("mousemove", event => {
        mouse.x = event.offsetX * window.devicePixelRatio;
        mouse.y = event.offsetY * window.devicePixelRatio;
    })

    ctxs[0].canvas.addEventListener("mousedown", event => isMousePressed = true);
    ctxs[0].canvas.addEventListener("mouseup", event => {
        isMousePressed = false
        canDelete = true;
    });

    function render() {
        ctxs[0].clearRect(0, 0, ctxs[0].canvas.width, ctxs[0].canvas.height);
        const tris = cdt2d(points, edges, { exterior: false });

        let closest = getClosestPoint(points, edges, mouse);
        drawEdges(ctxs[0], points, edges);
        drawPolygon(ctxs[0], points, tris);
        drawCircle(ctxs[0], { x: points[closest.point][0], y: points[closest.point][1] }, 10, closest.isBoundary ? "red" : "blue");
        drawCircle(ctxs[0], { x: mouse.x, y: mouse.y }, 10, "red");
        
        if (isMousePressed && canDelete && closest.point !== -1 && !closest.isBoundary) {
            points.splice(closest.point, 1);
            edges = recalculateEdges(edges, closest.point);
            canDelete = false;
        }

        drawText(ctxs[0], tris.length.toString(), {x: 100, y: 10}, 12, "black");
        // console.log("tris", tris.length)
    }

    setInterval(() => {
        render();
    }, 100);




    function getClosestPoint(points: number[][], edges: number[][], p: Vertex2D) {
        let closest = { point: -1, distance: Infinity, isBoundary: false };
        for (let i = 0; i < points.length; i++) {
            const px = points[i][0];
            const py = points[i][1];
            let distance = Math.hypot(p.x - px, p.y - py);
            if (distance < closest.distance) {
                closest.point = i;
                closest.distance = distance;
            }
        }
        for (const edge of edges) {
            if (edge[0] === closest.point || edge[1] === closest.point) closest.isBoundary = true;
        }
        
        return closest;
    }


    function drawPolygon(ctx, points, tris) {
        for (let i = 0; i < tris.length; i++) {
            const t = tris[i];
            const a = points[t[0]];
            const b = points[t[1]];
            const c = points[t[2]];
            // console.log(a,b,c)

            const tt = new Triangle(new Vector3(a[0], a[1], 0), new Vector3(b[0], b[1], 0), new Vector3(c[0], c[1], 0));
            drawTriangle(ctx, tt, "yellow", true);
        }
    }

    function drawEdges(ctx, points, edges) {
        for (let i = 0; i < edges.length; i++) {
            const fromP = points[edges[i][0]];
            const toP = points[edges[i][1]];
            const from = { x: fromP[0], y: fromP[1] };
            const to = { x: toP[0], y: toP[1] };

            drawLine(ctx, from, to, "green", 2);
        }
    }

    function recalculateEdges(edges: number[][], pointIndex: number): number[][] {
        let nedges: number[][] = [];
        for (var i = 0; i < edges.length; ++i) {
            var e: number[] = edges[i]
            for (var j = 0; j < 2; ++j) {
                if (e[j] > pointIndex) e[j] -= 1;
                else if (e[j] === pointIndex) continue;
            }
            nedges.push(e)
        }
        return nedges;
    }
};

Application();