import { Utils } from "../utils/Utils";


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

interface Vertex2D {
    x: number;
    y: number;
};

interface Triangle {
    a: Vertex2D;
    b: Vertex2D;
    c: Vertex2D;
}

interface Edge {
    from: Vertex2D;
    to: Vertex2D;
    boundary: boolean;
}

interface PathTriangle {
    triangles: Triangle[];
    edges: Edge[];
    color: string;
}

class Geometry {
    public extra: {};
    public triangles: Triangle[];
    public edges: Edge[] = [];

    private edgeMap: Map<string, Edge> = new Map();
    private vertexEdgeMap: Map<string, Edge[]> = new Map();

    public static vertexKey = (v: Vertex2D) => `${v.x}-${v.y}`;

    public static edgeKey(edge: Edge): string {
        const sorted = [edge.from, edge.to].sort((a, b) => {
            return a.x === b.x ? a.y - b.y : a.x - b.x;
        });
        return `${sorted[0].x},${sorted[0].y}:${sorted[1].x},${sorted[1].y}`;
    }

    private addToVertexToEdgeMap = (vertex: Vertex2D, edge: Edge) => {
        const key = Geometry.vertexKey(vertex);
        let m = this.vertexEdgeMap.get(key) || [];
        if (m.indexOf(edge) === -1) m.push(edge);
        this.vertexEdgeMap.set(key, m);
    }

    constructor(triangles: Triangle[], extra: {}) {
        this.triangles = triangles;
        this.extra = extra;
        this.CreateEdges();
        this.markBoundaryEdges();
    }

    private CreateEdges() {
        for (const triangle of this.triangles) {
            const edgeAB = {from: triangle.a, to: triangle.b, boundary: false};
            const edgeBC = {from: triangle.b, to: triangle.c, boundary: false};
            const edgeCA = {from: triangle.c, to: triangle.a, boundary: false};
            this.edges.push(edgeAB, edgeBC, edgeCA);
            this.edgeMap.set(Geometry.edgeKey(edgeAB), edgeAB);
            this.edgeMap.set(Geometry.edgeKey(edgeBC), edgeBC);
            this.edgeMap.set(Geometry.edgeKey(edgeCA), edgeCA);
            
            this.addToVertexToEdgeMap(triangle.a, edgeAB);
            this.addToVertexToEdgeMap(triangle.b, edgeAB);
            this.addToVertexToEdgeMap(triangle.b, edgeBC);
            this.addToVertexToEdgeMap(triangle.c, edgeBC);
            this.addToVertexToEdgeMap(triangle.c, edgeCA);
            this.addToVertexToEdgeMap(triangle.a, edgeCA);
        }
    }

    private markBoundaryEdges(): void {
        const edgeMap = new Map<string, Edge[]>();

        // Normalize and count edges
        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            const key = Geometry.edgeKey(edge);
            const edgeArray = edgeMap.get(key) || [];
            edgeArray.push(edge);
            edgeMap.set(key, edgeArray);
        }

        // Mark the boundary edges
        for (let [_, edges] of edgeMap) if (edges.length === 1) edges[0].boundary = true;
    }

    public getVertexEdges(vertex: Vertex2D): Edge[] {
        return this.vertexEdgeMap.get(Geometry.vertexKey(vertex)) || [];
    }

    public collapseEdge(edgeIndex: number): void {
        const edgeToCollapse = this.edges[edgeIndex];
        const vertexToRemove = edgeToCollapse.from; // The vertex to be removed
        const vertexToPreserve = edgeToCollapse.to; // The vertex to be preserved

        // Update all edges
        for (let i = 0; i < this.edges.length; i++) {
            if (this.edges[i].from === vertexToRemove) {
                this.edges[i].from = vertexToPreserve;
            }
            if (this.edges[i].to === vertexToRemove) {
                this.edges[i].to = vertexToPreserve;
            }
        }

        // Remove duplicate and self-loop edges
        this.removeDuplicateAndInvalidEdges();
    }

    private removeDuplicateAndInvalidEdges(): void {
        const uniqueEdges = new Map<string, Edge>();
        for (let edge of this.edges) {
            if (edge.from !== edge.to) { // Check to avoid self-loops
                const key = Geometry.edgeKey(edge);
                if (!uniqueEdges.has(key)) {
                    uniqueEdges.set(key, edge);
                }
            }
        }
        this.edges = Array.from(uniqueEdges.values());
    }
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

async function Application() {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const treeSVG = await get("./assets/research/tree-0.svg");
    const container = document.createElement("div");
    container.innerHTML = treeSVG;
    const paths = container.children.item(0)?.children;
    if (!paths) throw Error("No paths");

    const triangles: PathTriangle[] = [];
    const zoom: Vertex2D = {x: 3, y: 3};

    for (const path of paths) {
        const pathD = path.getAttribute("d");
        const pathColor = path.getAttribute("fill");
        if (!pathD) continue;
        if (!pathColor) continue;

        const trianglesStr = Utils.StringFindAllBetween(pathD, "M ", " Z");

        const pathTriangles: PathTriangle = {color: pathColor, triangles: [], edges: []};
        for (const triangleStr of trianglesStr) {
            const trianglesStrArr = triangleStr.split(" ");

            const triangle: Triangle = {a: {x: 0, y: 0}, b: {x: 0, y: 0}, c: {x: 0, y: 0}};

            for (let i = 0; i < trianglesStrArr.length; i++) {
                if (i >= 3) throw Error("No triangle has more than 3 sides");
                const vertexStrArr = trianglesStrArr[i].split(",");
                if (vertexStrArr.length > 2) throw Error("Expecting 2D vertices");
                const x = parseFloat(vertexStrArr[0]);
                const y = parseFloat(vertexStrArr[1]);
                if (i === 0) triangle.a = {x: x * zoom.x, y: y * zoom.y};
                if (i === 1) triangle.b = {x: x * zoom.x, y: y * zoom.y};
                if (i === 2) triangle.c = {x: x * zoom.x, y: y * zoom.y};
            }
            pathTriangles.triangles.push(triangle);
        }
        triangles.push(pathTriangles);
    }

    let offset: Vertex2D = {x: 0, y: 0};
    
    // Draw paths
    for (const pathTriangles of triangles) {
        for (const triangle of pathTriangles.triangles) {
            drawTriangle(ctx, triangle, pathTriangles.color);
        }
    }


    const geometries: Geometry[] = [];
    for (const pathTriangles of triangles) {
        geometries.push(new Geometry(pathTriangles.triangles, {color: pathTriangles.color}));
    }

    console.log(geometries);

    let canvases: HTMLCanvasElement[] = [];
    let ctxs: CanvasRenderingContext2D[] = [];
    for (let i = 0; i < 3; i++) {
        const _canvas = document.createElement("canvas");
        _canvas.width = canvas.width;
        _canvas.height = canvas.height;
        _canvas.style.width = canvas.style.width;
        _canvas.style.height = canvas.style.height;
        document.body.appendChild(_canvas);
        const _ctx = _canvas.getContext('2d') as CanvasRenderingContext2D;
        ctxs.push(_ctx);
        
    }

    const geometry = geometries[0];
    for (const triangle of geometry.triangles) {
        drawTriangle(ctxs[0], triangle, geometry.extra.color);
    }

    let i = 0;
    for (const edge of geometry.edges) {
        const midpoint = (from: Vertex2D, to: Vertex2D) => {return {x: (to.x + from.x) / 2, y: (to.y + from.y) / 2} }
        drawLine(ctxs[0], edge.from, edge.to, "green", 2);
        drawText(ctxs[0], `${i}`, midpoint(edge.from, edge.to), 10, "red");
        if (edge.boundary === true) {
            drawCircle(ctxs[0], {x: edge.from.x, y: edge.from.y}, 5, "red");
        }
        i++;
    }

    // Try simplify
    let vertexToCollapse: Vertex2D | null = null;
    for (let i = 0; i < geometry.triangles.length; i++) {
        const triangle = geometry.triangles[i];

        let color = geometry.extra.color;
        if (i === 58) {
            vertexToCollapse = triangle.a;
        }
        drawTriangle(ctxs[1], triangle, color);
        ctxs[1].fillStyle = "black";
        ctxs[1].font = "12px monospace";
        ctxs[1].fillText(`${i}`, triangle.a.x, triangle.a.y);
        
    }

    // for (let i = 0; i < geometry.triangles.length; i++) {
    //     const triangle = geometry.triangles[i];

    //     if (triangle.a === vertexToCollapse) {
    //         drawCircle(ctxs[1], triangle.a, 10, "blue");
    //         const edges = geometry.getVertexEdges(vertexToCollapse);
    //         console.log(edges)

            
    //         const edgeToCollapseTo = edges[0];
    //         drawLine(ctxs[1], edgeToCollapseTo.from, edgeToCollapseTo.to, "blue", 5);

    //         for (let j = 0; j < edges.length; j++) {
    //             const edge = edges[j];
    //             if (Geometry.edgeKey(edge) === Geometry.edgeKey(edgeToCollapseTo)) continue;
    //             drawLine(ctxs[1], edge.from, edge.to, "green", 5);
    //             if (Geometry.vertexKey(edge.from) === Geometry.vertexKey(vertexToCollapse)) {
    //                 geometry.edges[j].from = edgeToCollapseTo.from;
    //                 console.log("HERE")
    //             }
    //             else if (Geometry.vertexKey(edge.to) === Geometry.vertexKey(vertexToCollapse)) {
    //                 geometry.edges[j].to = edgeToCollapseTo.from;
    //                 console.log("HERE")
    //             }
    //         }

    //         const edgeIndex = geometry.edges.indexOf(edgeToCollapseTo);
    //         if (edgeIndex !== -1) {
    //             console.log("Removing");
    //             geometry.edges.splice(edgeIndex, 1);
    //         }
    //     }
    // }

    for (let i = 0; i < geometry.edges.length; i+=20) {
        geometry.collapseEdge(i)
    }


    for (const edge of geometry.edges) {
        drawLine(ctxs[2], edge.from, edge.to, geometry.extra.color);
    }
};

Application();