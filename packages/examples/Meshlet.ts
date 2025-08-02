import { Utils } from "../utils/Utils";

import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { FQMR } from "../plugins/meshlets/FQMR";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { MeshletMerger } from "../plugins/meshlets/utils/MeshletMerger";
import { MeshletGrouper } from "../plugins/meshlets/utils/MeshletGrouper";
import { MeshletCreator } from "../plugins/meshlets/utils/MeshletCreator";
import { Renderer } from "../renderer/Renderer";

import { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Metis } from "../plugins/meshlets/Metis";

// const toIndexed = function () {
// 	let list: number[] = [];
//     let vertices = {};

// 	let _src: Geometry;
//     let attributesKeys;

// 	let prec = 0, precHalf = 0, length = 0;


// 	function floor( array, offset ) {
// 		if ( array instanceof Float32Array ) {
// 			return Math.floor( array[ offset ] * prec );
// 		} else {
// 			return array[ offset ];
// 		}
// 	}

// 	function createAttribute( src_attribute: VertexAttribute ) {

// 		const dst_attribute = new VertexAttribute( new Float32Array( length * 3 ));

// 		const dst_array = dst_attribute.array;
// 		const src_array = src_attribute.array;

//         for ( let i = 0, l = list.length; i < l; i++ ) {
//             const index = list[ i ] * 3;
//             const offset = i * 3;
//             dst_array[ offset ] = src_array[ index ];
//             dst_array[ offset + 1 ] = src_array[ index + 1 ];
//             dst_array[ offset + 2 ] = src_array[ index + 2 ];
//         }
// 		return dst_attribute;
// 	}

// 	function hashAttribute( attribute: VertexAttribute, offset: number ) {
// 		const array = attribute.array;
//         return floor( array, offset ) + '_' + floor( array, offset + 1 ) + '_' + floor( array, offset + 2 );
// 	}


// 	function store( index, n ) {

// 		let id = '';

// 		for ( let i = 0, l = attributesKeys.length; i < l; i++ ) {

// 			const key = attributesKeys[ i ];
// 			const attribute = _src.attributes.get(key);

//             const offset = 3 * index * 3 + n * 3;

// 			id += hashAttribute( attribute, offset ) + '_';
//             console.log(attribute, offset)
// 		}

// 		if ( vertices[ id ] === undefined ) {

// 			vertices[ id ] = list.length;

// 			list.push( index * 3 + n );

// 		}

// 		return vertices[ id ];

// 	}

// 	function storeFast( x, y, z, v ) {


// 		const id = Math.floor( x * prec ) + '_' + Math.floor( y * prec ) + '_' + Math.floor( z * prec );

// 		if ( vertices[ id ] === undefined ) {

// 			vertices[ id ] = list.length;


// 			list.push( v );

// 		}

// 		return vertices[ id ];

// 	}


// 	function indexBufferGeometry( src: Geometry, dst: Geometry, fullIndex: boolean ) {

// 		_src = src;

// 		attributesKeys = ["position"]



// 		const position = src.attributes.get("position").array;
// 		const faceCount = position.length / 3 / 3;

// 		const typedArray = faceCount * 3 > 65536 ? Uint32Array : Uint16Array;
// 		const indexArray = new typedArray( faceCount * 3 );


// 		// Full index only connects vertices where all attributes are equal

// 		if ( fullIndex ) {

// 			for ( let i = 0, l = faceCount; i < l; i++ ) {

// 				indexArray[ i * 3 ] = store( i, 0 );
// 				indexArray[ i * 3 + 1 ] = store( i, 1 );
// 				indexArray[ i * 3 + 2 ] = store( i, 2, );

// 			}

// 		} else {

// 			for ( let i = 0, l = faceCount; i < l; i++ ) {

// 				const offset = i * 9;

// 				indexArray[ i * 3 ] = storeFast( position[ offset ], position[ offset + 1 ], position[ offset + 2 ], i * 3 );
// 				indexArray[ i * 3 + 1 ] = storeFast( position[ offset + 3 ], position[ offset + 4 ], position[ offset + 5 ], i * 3 + 1 );
// 				indexArray[ i * 3 + 2 ] = storeFast( position[ offset + 6 ], position[ offset + 7 ], position[ offset + 8 ], i * 3 + 2 );

// 			}

// 		}


// 		// Index
// 		dst.index = new IndexAttribute( new Uint32Array(indexArray) );
// 		length = list.length;

// 		// Attributes

// 		for ( let i = 0, l = attributesKeys.length; i < l; i++ ) {

// 			const key = attributesKeys[ i ];

// 			dst.attributes.set(key, createAttribute( src.attributes.get(key)));

// 		}

// 		// Release data

// 		vertices = {};
// 		list = [];

// 		_src = null;
// 		attributesKeys = [];

// 	}


// 	return function( geometry: Geometry, fullIndex = true, precision = 6 ) {

// 		precision = precision || 6;

// 		prec = Math.pow( 10, precision );
// 		precHalf = Math.pow( 10, Math.floor( precision / 2 ) );

// 		const output = new Geometry();

// 		indexBufferGeometry(geometry, output, fullIndex === undefined ? true : fullIndex );


// 		return output;

// 	}
// }()

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

interface PathTriangle {
    triangles: Triangle[];
    color: string;
}

function drawTriangle(ctx: CanvasRenderingContext2D, triangle: Triangle, offset: Vertex2D, zoom: Vertex2D, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo((triangle.a.x + offset.x) * zoom.x, (triangle.a.y + offset.y) * zoom.y);
    ctx.lineTo((triangle.b.x + offset.x) * zoom.x, (triangle.b.y + offset.y) * zoom.y);
    ctx.lineTo((triangle.c.x + offset.x) * zoom.x, (triangle.c.y + offset.y) * zoom.y);
    ctx.lineTo((triangle.a.x + offset.x) * zoom.x, (triangle.a.y + offset.y) * zoom.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
}

function drawMeshlet(ctx: CanvasRenderingContext2D, meshlet: Meshlet, offset: Vertex2D, zoom: Vertex2D, color: string) {
    for (let i = 0; i < meshlet.indices.length; i+=3) {
        const t0 = meshlet.indices[i + 0];
        const t1 = meshlet.indices[i + 1];
        const t2 = meshlet.indices[i + 2];

        const avx = meshlet.vertices[t0 * 3 + 0];
        const avy = meshlet.vertices[t0 * 3 + 1];
        const avz = meshlet.vertices[t0 * 3 + 2];

        const bvx = meshlet.vertices[t1 * 3 + 0];
        const bvy = meshlet.vertices[t1 * 3 + 1];
        const bvz = meshlet.vertices[t1 * 3 + 2];

        const cvx = meshlet.vertices[t2 * 3 + 0];
        const cvy = meshlet.vertices[t2 * 3 + 1];
        const cvz = meshlet.vertices[t2 * 3 + 2];

        const triangle: Triangle = {
            a: {x: avx, y: avy},
            b: {x: bvx, y: bvy},
            c: {x: cvx, y: cvy},
        }

        drawTriangle(ctx, triangle, offset, zoom, color);
    }
}

async function Application() {
    console.log("ALIVE")
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const treeSVG = await get("./assets/research/tree-0.svg");
    const container = document.createElement("div");
    container.innerHTML = treeSVG;
    const a = new Path2D(container.children.item(0)?.innerHTML)
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

        const pathTriangles: PathTriangle = {color: pathColor, triangles: []};
        for (const triangleStr of trianglesStr) {
            const trianglesStrArr = triangleStr.split(" ");

            const triangle: Triangle = {a: {x: 0, y: 0}, b: {x: 0, y: 0}, c: {x: 0, y: 0}};

            for (let i = 0; i < trianglesStrArr.length; i++) {
                if (i >= 3) throw Error("No triangle has more than 3 sides");
                const vertexStrArr = trianglesStrArr[i].split(",");
                if (vertexStrArr.length > 2) throw Error("Expecting 2D vertices");
                const x = parseFloat(vertexStrArr[0]);
                const y = parseFloat(vertexStrArr[1]);
                if (i === 0) triangle.a = {x: x, y: y};
                if (i === 1) triangle.b = {x: x, y: y};
                if (i === 2) triangle.c = {x: x, y: y};
            }
            pathTriangles.triangles.push(triangle);
        }
        triangles.push(pathTriangles);
    }

    let offset: Vertex2D = {x: 0, y: 0};
    for (const pathTriangles of triangles) {
        for (const triangle of pathTriangles.triangles) {
            drawTriangle(ctx, triangle, offset, zoom, pathTriangles.color);
        }
    }

    const webgpuCanvas = document.createElement("canvas");
    const renderer = Renderer.Create(webgpuCanvas, "webgpu");
    // const scene = new Scene(renderer);
    // const mainCameraGameObject = new GameObject(scene);
    // mainCameraGameObject.transform.position.set(0,0,-15);
    // // mainCameraGameObject.transform.position.z = -15;
    // mainCameraGameObject.name = "MainCamera";
    // const camera = mainCameraGameObject.AddComponent(Camera);

    const canvases: HTMLCanvasElement[] = new Array(10).fill(null).map(value => document.createElement("canvas"));
    const ctxs: CanvasRenderingContext2D[] = [];



    for (const _canvas of canvases) {
        _canvas.width = canvas.width;
        _canvas.height = canvas.height;
        _canvas.style.width = canvas.style.width;
        _canvas.style.height = canvas.style.height;
        ctxs.push(_canvas.getContext("2d") as CanvasRenderingContext2D);
        document.body.appendChild(_canvas);
    }
    // Build vertices and indices from SVG triangles
    let meshlets: Meshlet[] = [];
    for (const pathTriangles of triangles) {
        let vertices: number[] = [];
        for (const triangle of pathTriangles.triangles) {
            vertices.push(triangle.a.x, triangle.a.y, 0);
            vertices.push(triangle.b.x, triangle.b.y, 0);
            vertices.push(triangle.c.x, triangle.c.y, 0);
        }

        let verticesF = new Float32Array(vertices);

        function toIndexed(vertices: Float32Array): {vertices: Float32Array, indices: Uint32Array} {
            const geometry2 = new BufferGeometry();
            geometry2.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    
            const geometry2Indexed = mergeVertices(geometry2);
            return {vertices: geometry2Indexed.getAttribute("position").array, indices: geometry2Indexed.index?.array};
        }

        const verticesIndexed = toIndexed(verticesF);
        const meshlet = new Meshlet(verticesIndexed.vertices, verticesIndexed.indices);
        meshlet.color = pathTriangles.color;
        meshlets.push(meshlet);
    }

    for (let i = 0; i < meshlets.length; i++) {
        const meshlet = meshlets[i];
        drawMeshlet(ctxs[1], meshlet, {x: 0, y: 0}, zoom, meshlet.color);
        ctxs[1].fillStyle = "red";
        ctxs[1].font = "20px monospace";
        ctxs[1].fillText(`${i}`, meshlet.bounds.center.x * zoom.x, meshlet.bounds.center.y * zoom.y);
    }


    function hexColorToRGBNorm(hexColor: string): {r: number, g: number, b: number} {
        const cn1 = parseInt(hexColor.replace("#", "0x"));
        return {r: (cn1 >> 16) / 255, g: (cn1 >> 8 & 0xff) / 255, b: (cn1 & 0xff) / 255};
    }

    function RGBNormToHex(rgbNorm: {r: number, g: number, b: number}): string {
        const r = Math.floor(rgbNorm.r * 255);
        const g = Math.floor(rgbNorm.g * 255);
        const b = Math.floor(rgbNorm.b * 255);
        return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
    }

    function meshletToTHREEGeometry(meshlet: Meshlet): BufferGeometry {
        const geo = new BufferGeometry();
        geo.setAttribute("position", new Float32BufferAttribute(meshlet.vertices, 3));
        geo.setIndex(new Uint32BufferAttribute(meshlet.indices, 3));
        return geo;
    }

    function THREEToMeshlet(bufferGeometry: BufferGeometry): Meshlet {
        return new Meshlet(bufferGeometry.getAttribute("position").array, bufferGeometry.index.array);
    }

    function anotherMerge(meshlets: Meshlet[]): Meshlet {
        let vertices: number[] = [];
        let indices: number[] = [];

        let indicesOffset = 0;

        for (const meshlet of meshlets) {
            for (const vertex of meshlet.vertices) vertices.push(vertex);
            for (const index of meshlet.indices) indices.push(index + indicesOffset);
            indicesOffset += meshlet.vertices.length / 3;
        }

        return new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
    }

    
    // const bg0 = meshletToTHREEGeometry(meshlets[0]);
    // const bg1 = meshletToTHREEGeometry(meshlets[1]);
    // const mergedBG = mergeGeometries([bg0, bg1]);
    
    // const merged = THREEToMeshlet(mergeVertices(mergedBG));
    // console.log(merged)

    // const merged = anotherMerge(meshlets[0], meshlets[1]);
    // console.log(merged)
    
    // const cleaned = Meshoptimizer.clean(merged)
    // console.log(cleaned)
    // // const merged = MeshletMerger.merge([meshlets[0], meshlets[4]]);

    // drawMeshlet(ctxs[2], merged, {x: 0, y: 0}, zoom, "#ff000020");

    function rand(co: number) {
        function fract(n) {
            return n % 1;
        }

        return Math.abs(fract(Math.sin((co + 1) * 12.9898) * 43758.5453));
    }

    function step(meshlets: Meshlet[], ctx: CanvasRenderingContext2D) {
        let newMeshlets: Meshlet[] = [];
        console.log("stepping", meshlets.length)
        let groups = [meshlets];
        const nparts = meshlets.length / 4;
        if (nparts > 1) {
            groups = MeshletGrouper.group(meshlets, nparts);
        }
        console.log(groups, meshlets.length)
        let iteration = 0;
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const merged = anotherMerge(group);
            const cleaned = Meshoptimizer.clean(merged);
            let simplified = Meshoptimizer.meshopt_simplify(cleaned, cleaned.indices.length / 2);
            const simplified2 = FQMR.setSimplifyRebuilt(cleaned, cleaned.indices.length / 3 / 2, false, false);
            simplified.meshlet = simplified2;
    
            // const mergedColor = `#${Math.floor(rand(i) * 0xffffff).toString(16)}`;
            const mergedColor = meshlets[i].color;
            simplified.meshlet.color = mergedColor;

            // drawMeshlet(ctx, simplified.meshlet, {x: 0, y: 0}, zoom, mergedColor);
            // newMeshlets.push(simplified.meshlet);

            const splits = MeshletGrouper.split(simplified.meshlet, 2);
            
            console.log("splits", groups.length, splits.length)
            // // const sc = Meshoptimizer.clean(simplified.meshlet);
            // // const splits = MeshletCreator.build(sc.vertices, sc.indices, 255, Meshlet.max_triangles);

            for (let j = 0; j < splits.length; j++) {
                const split = splits[j];
                
                const splitColor = `#${Math.floor(rand(iteration * 121.121) * 0xffffff).toString(16)}`;
                split.color = splitColor;
                drawMeshlet(ctx, split, {x: 0, y: 0}, zoom, splitColor);
                // break;
                iteration++;
                newMeshlets.push(split);
            }
            // break;
        }
        return newMeshlets;
    }

    await Meshoptimizer.load();
    await FQMR.load();
    await Metis.load();

    let s0 = step(meshlets, ctxs[2]);
    console.log(s0.length)
    // s0 = [
    //     s0[0], s0[2], s0[4], s0[6],
    //     s0[1], s0[3], s0[5], s0[7],
    // ]
    let s1 = step(s0, ctxs[3]);
    // s1 = [
    //     s1[0], s1[2],
    //     s1[1], s1[3]
    // ]
    // console.log(s1)
    const s2 = step(s1, ctxs[4]);



};

Application();