import { Utils } from "./Utils";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";

export class GeometryAttribute {
    array: Float32Array | Uint32Array;
    buffer: Buffer;

    constructor(array: Float32Array | Uint32Array, type: BufferType) {
        this.array = array;
        this.buffer = Buffer.Create(array.byteLength, type);
        this.buffer.SetArray(this.array);
    }

    public GetBuffer(): Buffer { return this.buffer };
};

export class VertexAttribute extends GeometryAttribute {
    constructor(array: Float32Array) { super(array, BufferType.VERTEX) }
}

export class IndexAttribute extends GeometryAttribute {
    constructor(array: Uint32Array) { super(array, BufferType.INDEX) }
}

export class Geometry {
    public id = Utils.UUID();
    public index?: IndexAttribute;
    public readonly attributes: Map<string, VertexAttribute> = new Map();

    public ComputeNormals() {
        let posAttrData = this.attributes.get("position")?.array;
        let indexAttrData = this.index?.array;
        if (!posAttrData || !indexAttrData) throw Error("Cannot compute normals without vertices and indices");

        let normalAttrData = new Float32Array(posAttrData.length);

        let trianglesCount = indexAttrData.length / 3;
        let point1 = new Vector3(0, 1, 0);
        let point2 = new Vector3(0, 1, 0);
        let point3 = new Vector3(0, 1, 0);
        let crossA = new Vector3(0, 1, 0);
        let crossB = new Vector3(0, 1, 0);

        for (let i = 0; i < trianglesCount; i++) {
            let index1 = indexAttrData[i * 3];
            let index2 = indexAttrData[i * 3 + 1];
            let index3 = indexAttrData[i * 3 + 2];

            point1.set(posAttrData[index1 * 3], posAttrData[index1 * 3 + 1], posAttrData[index1 * 3 + 2]);
            point2.set(posAttrData[index2 * 3], posAttrData[index2 * 3 + 1], posAttrData[index2 * 3 + 2]);
            point3.set(posAttrData[index3 * 3], posAttrData[index3 * 3 + 1], posAttrData[index3 * 3 + 2]);

            crossA.copy(point1).sub(point2).normalize();
            crossB.copy(point1).sub(point3).normalize();

            let normal = crossA.clone().cross(crossB).normalize();

            normalAttrData[index1 * 3] = normalAttrData[index2 * 3] = normalAttrData[index3 * 3] = normal.x;
            normalAttrData[index1 * 3 + 1] = normalAttrData[index2 * 3 + 1] = normalAttrData[index3 * 3 + 1] = normal.y;
            normalAttrData[index1 * 3 + 2] = normalAttrData[index2 * 3 + 2] = normalAttrData[index3 * 3 + 2] = normal.z;
        }

        let normals = this.attributes.get("normal");
        if (!normals) normals = new VertexAttribute(normalAttrData);
        this.attributes.set("normal", normals);
    }

    public static Cube(): Geometry {
        const vertices = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5]);
        const indices = new Uint32Array([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22, 21, 22, 23, 21]);
        const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0]);
        
        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        geometry.ComputeNormals();

        return geometry;
    }

    public static Plane(): Geometry {
        const vertices = new Float32Array([
            -1.0, -1.0, 0,  // Bottom left
             1.0, -1.0, 0,  // Bottom right
             1.0,  1.0, 0,  // Top right
            -1.0,  1.0, 0   // Top left
        ])

        const indices = new Uint32Array([
            0, 1, 2,  // First triangle (bottom left to top right)
            2, 3, 0   // Second triangle (top right to top left)
        ]);

        const uvs = new Float32Array([
            0.0, 1.0,  // Bottom left (now top left)
            1.0, 1.0,  // Bottom right (now top right)
            1.0, 0.0,  // Top right (now bottom right)
            0.0, 0.0   // Top left (now bottom left)
        ]);

        const normals = new Float32Array([
            0.0, 0.0, 1.0,  // Normal for bottom left vertex
            0.0, 0.0, 1.0,  // Normal for bottom right vertex
            0.0, 0.0, 1.0,  // Normal for top right vertex
            0.0, 0.0, 1.0   // Normal for top left vertex
        ]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        // geometry.ComputeNormals();
        
        return geometry;
    }

    public static Sphere(): Geometry {
        const radius = 0.5;
        const phiStart = 0;
        const phiLength = Math.PI * 2;
        const thetaStart = 0;
        const thetaLength = Math.PI;

        let widthSegments = 32;
        let heightSegments = 16;
        widthSegments = Math.max( 3, Math.floor( widthSegments ) );
        heightSegments = Math.max( 2, Math.floor( heightSegments ) );

        const thetaEnd = Math.min( thetaStart + thetaLength, Math.PI );

        let index = 0;
        const grid: number[][] = [];

        const vertex = new Vector3();
        const normal = new Vector3();

        // buffers

        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        // generate vertices, normals and uvs

        for ( let iy = 0; iy <= heightSegments; iy ++ ) {
            const verticesRow: number[] = [];

            const v = iy / heightSegments;

            // special case for the poles

            let uOffset = 0;

            if ( iy === 0 && thetaStart === 0 ) uOffset = 0.5 / widthSegments;
            else if ( iy === heightSegments && thetaEnd === Math.PI ) uOffset = - 0.5 / widthSegments;

            for ( let ix = 0; ix <= widthSegments; ix ++ ) {
                const u = ix / widthSegments;

                // vertex
                vertex.x = - radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
                vertex.y = radius * Math.cos( thetaStart + v * thetaLength );
                vertex.z = radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
                vertices.push( vertex.x, vertex.y, vertex.z );

                // normal
                normal.copy( vertex ).normalize();
                normals.push( normal.x, normal.y, normal.z );

                // uv
                uvs.push( u + uOffset, 1 - v );
                verticesRow.push( index ++ );
            }
            grid.push( verticesRow );
        }

        // indices

        for ( let iy = 0; iy < heightSegments; iy ++ ) {
            for ( let ix = 0; ix < widthSegments; ix ++ ) {
                const a = grid[ iy ][ ix + 1 ];
                const b = grid[ iy ][ ix ];
                const c = grid[ iy + 1 ][ ix ];
                const d = grid[ iy + 1 ][ ix + 1 ];

                if ( iy !== 0 || thetaStart > 0 ) indices.push( a, b, d );
                if ( iy !== heightSegments - 1 || thetaEnd < Math.PI ) indices.push( b, c, d );
            }
        }

        // build geometry
        const geometry = new Geometry();
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
        
        return geometry;
    }
}