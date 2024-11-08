import { Quaternion } from "./Quaternion";
import { Vector3 } from "./Vector3";

export class Matrix4 {
	public elements: Float32Array;

	constructor(
		n11 = 1, n12 = 0, n13 = 0, n14 = 0,
		n21 = 0, n22 = 1, n23 = 0, n24 = 0,
		n31 = 0, n32 = 0, n33 = 1, n34 = 0,
		n41 = 0, n42 = 0, n43 = 0, n44 = 1) {
		this.elements = new Float32Array(16);
		this.set(
			n11, n12, n13, n14,
			n21, n22, n23, n24,
			n31, n32, n33, n34,
			n41, n42, n43, n44
		);
	}

	public copy(m: Matrix4) {
		const te = this.elements;
		const me = m.elements;

		te[0] = me[0]; te[1] = me[1]; te[2] = me[2]; te[3] = me[3];
		te[4] = me[4]; te[5] = me[5]; te[6] = me[6]; te[7] = me[7];
		te[8] = me[8]; te[9] = me[9]; te[10] = me[10]; te[11] = me[11];
		te[12] = me[12]; te[13] = me[13]; te[14] = me[14]; te[15] = me[15];

		return this;
	}

	public set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number) {
		const te = this.elements;

		te[0] = n11; te[4] = n12; te[8] = n13; te[12] = n14;
		te[1] = n21; te[5] = n22; te[9] = n23; te[13] = n24;
		te[2] = n31; te[6] = n32; te[10] = n33; te[14] = n34;
		te[3] = n41; te[7] = n42; te[11] = n43; te[15] = n44;

		return this;
	}

	public setFromArray(array: ArrayLike<number>): Matrix4 {
		this.elements.set(array);
		return this;
	}

	public clone() {
		return new Matrix4().setFromArray(this.elements);
	}

	public compose(position: Vector3, quaternion: Quaternion, scale: Vector3) {
		const te = this.elements;

		const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
		const x2 = x + x, y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		const sx = scale.x, sy = scale.y, sz = scale.z;

		te[0] = (1 - (yy + zz)) * sx;
		te[1] = (xy + wz) * sx;
		te[2] = (xz - wy) * sx;
		te[3] = 0;

		te[4] = (xy - wz) * sy;
		te[5] = (1 - (xx + zz)) * sy;
		te[6] = (yz + wx) * sy;
		te[7] = 0;

		te[8] = (xz + wy) * sz;
		te[9] = (yz - wx) * sz;
		te[10] = (1 - (xx + yy)) * sz;
		te[11] = 0;

		te[12] = position.x;
		te[13] = position.y;
		te[14] = position.z;
		te[15] = 1;

		return this;
	}

	public mul(m: Matrix4) {
		return this.multiplyMatrices(this, m);
	}

	public multiplyMatrices(a: Matrix4, b: Matrix4) {
		const ae = a.elements;
		const be = b.elements;
		const te = this.elements;

		const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
		const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
		const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
		const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

		const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
		const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
		const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
		const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

		te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
		te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
		te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
		te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

		te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
		te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
		te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
		te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

		te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
		te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
		te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
		te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

		te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
		te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
		te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
		te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

		return this;
	}

	public invert(): Matrix4 {
		// based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
		const te = this.elements,

			n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3],
			n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7],
			n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11],
			n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15],

			t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
			t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
			t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
			t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

		const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

		if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

		const detInv = 1 / det;

		te[0] = t11 * detInv;
		te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
		te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
		te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;

		te[4] = t12 * detInv;
		te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
		te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
		te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;

		te[8] = t13 * detInv;
		te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
		te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
		te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;

		te[12] = t14 * detInv;
		te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
		te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
		te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;

		return this;
	}

	public determinant(): number {
		const te = this.elements;

		const n11 = te[ 0 ], n12 = te[ 4 ], n13 = te[ 8 ], n14 = te[ 12 ];
		const n21 = te[ 1 ], n22 = te[ 5 ], n23 = te[ 9 ], n24 = te[ 13 ];
		const n31 = te[ 2 ], n32 = te[ 6 ], n33 = te[ 10 ], n34 = te[ 14 ];
		const n41 = te[ 3 ], n42 = te[ 7 ], n43 = te[ 11 ], n44 = te[ 15 ];

		//TODO: make this more efficient
		//( based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm )

		return (
			n41 * (
				+ n14 * n23 * n32
				 - n13 * n24 * n32
				 - n14 * n22 * n33
				 + n12 * n24 * n33
				 + n13 * n22 * n34
				 - n12 * n23 * n34
			) +
			n42 * (
				+ n11 * n23 * n34
				 - n11 * n24 * n33
				 + n14 * n21 * n33
				 - n13 * n21 * n34
				 + n13 * n24 * n31
				 - n14 * n23 * n31
			) +
			n43 * (
				+ n11 * n24 * n32
				 - n11 * n22 * n34
				 - n14 * n21 * n32
				 + n12 * n21 * n34
				 + n14 * n22 * n31
				 - n12 * n24 * n31
			) +
			n44 * (
				- n13 * n22 * n31
				 - n11 * n23 * n32
				 + n11 * n22 * n33
				 + n13 * n21 * n32
				 - n12 * n21 * n33
				 + n12 * n23 * n31
			)

		);
	}

	public transpose() {
		const te = this.elements;
		let tmp;

		tmp = te[1]; te[1] = te[4]; te[4] = tmp;
		tmp = te[2]; te[2] = te[8]; te[8] = tmp;
		tmp = te[6]; te[6] = te[9]; te[9] = tmp;

		tmp = te[3]; te[3] = te[12]; te[12] = tmp;
		tmp = te[7]; te[7] = te[13]; te[13] = tmp;
		tmp = te[11]; te[11] = te[14]; te[14] = tmp;

		return this;
	}

	public perspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
		const fovRad = fov * (Math.PI / 180);
		const f = 1 / Math.tan(fovRad / 2);
		const depth = 1 / (near - far);

		return this.set(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * depth, -1, 0, 0, 2 * far * near * depth, 0);
	}

	public perspectiveZO(fovy: number, aspect: number, near: number, far: number): Matrix4 {
		const f = 1.0 / Math.tan((fovy * (Math.PI / 180)) / 2);
		this.elements[0] = f / aspect;
		this.elements[1] = 0;
		this.elements[2] = 0;
		this.elements[3] = 0;
		this.elements[4] = 0;
		this.elements[5] = f;
		this.elements[6] = 0;
		this.elements[7] = 0;
		this.elements[8] = 0;
		this.elements[9] = 0;
		this.elements[11] = -1;
		this.elements[12] = 0;
		this.elements[13] = 0;
		this.elements[15] = 0;
		if (far != null && far !== Infinity) {
		  const nf = 1 / (near - far);
		  this.elements[10] = far * nf;
		  this.elements[14] = far * near * nf;
		} else {
		  this.elements[10] = -1;
		  this.elements[14] = -near;
		}
		return this;
	}

	public getInfinitePerspectiveMatrix(_fov: number, _aspect: number, _near: number): Matrix4 {
		const f = 1.0 / Math.tan((_fov * Math.PI / 180) / 2.0);
		this.elements.set([
			f / _aspect, 0.0, 0.0, 0.0,
			0.0, -f, 0.0, 0.0,
			0.0, 0.0, 0.0, -1.0,
			0.0, 0.0, _near, 0.0
		])
		return this;
	}

	public orthogonal(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
		const horizontal = 1 / (left - right)
		const vertical = 1 / (bottom - top)
		const depth = 1 / (near - far)

		return this.set(-2 * horizontal, 0, 0, 0, 0, -2 * vertical, 0, 0, 0, 0, 2 * depth, 0, (left + right) * horizontal, (top + bottom) * vertical, (far + near) * depth, 1);
	}

	// public orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
	// 	const horizontal = 1 / (left - right);
	// 	const vertical = 1 / (bottom - top);
	// 	const depth = 1 / (near - far);
	// 	return this.set(-2 * horizontal, 0, 0, 0, 0, -2 * vertical, 0, 0, 0, 0, depth, 0, (left + right) * horizontal, (top + bottom) * vertical, near * depth, 1);
	// }

	public orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
		var lr = 1 / (left - right);
		var bt = 1 / (bottom - top);
		var nf = 1 / (near - far);
		const out = new Float32Array(16);
		out[0] = -2 * lr;
		out[1] = 0;
		out[2] = 0;
		out[3] = 0;
		out[4] = 0;
		out[5] = -2 * bt;
		out[6] = 0;
		out[7] = 0;
		out[8] = 0;
		out[9] = 0;
		out[10] = nf;
		out[11] = 0;
		out[12] = (left + right) * lr;
		out[13] = (top + bottom) * bt;
		out[14] = near * nf;
		out[15] = 1;
		return this.setFromArray(out);
	}

	public identity(): Matrix4 {
		this.elements[0] = 1;
		this.elements[1] = 0;
		this.elements[2] = 0;
		this.elements[3] = 0;
		this.elements[4] = 0;
		this.elements[5] = 1;
		this.elements[6] = 0;
		this.elements[7] = 0;
		this.elements[8] = 0;
		this.elements[9] = 0;
		this.elements[10] = 1;
		this.elements[11] = 0;
		this.elements[12] = 0;
		this.elements[13] = 0;
		this.elements[14] = 0;
		this.elements[15] = 1;
		return this;
	}

	public lookAt(eye: Vector3, center: Vector3, up: Vector3): Matrix4 {
		let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
		let eyex = eye.x;
		let eyey = eye.y;
		let eyez = eye.z;
		let upx = up.x;
		let upy = up.y;
		let upz = up.z;
		let centerx = center.x;
		let centery = center.y;
		let centerz = center.z;
	
		const EPSILON = 0.000001;
		if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
			return this.identity();
		}
	
		z0 = eyex - centerx;
		z1 = eyey - centery;
		z2 = eyez - centerz;
	
		len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
		z0 *= len;
		z1 *= len;
		z2 *= len;
	
		x0 = upy * z2 - upz * z1;
		x1 = upz * z0 - upx * z2;
		x2 = upx * z1 - upy * z0;
		len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
		if (!len) {
			x0 = 0;
			x1 = 0;
			x2 = 0;
		} else {
			len = 1 / len;
			x0 *= len;
			x1 *= len;
			x2 *= len;
		}
	
		y0 = z1 * x2 - z2 * x1;
		y1 = z2 * x0 - z0 * x2;
		y2 = z0 * x1 - z1 * x0;
	
		len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
		if (!len) {
			y0 = 0;
			y1 = 0;
			y2 = 0;
		} else {
			len = 1 / len;
			y0 *= len;
			y1 *= len;
			y2 *= len;
		}
	
		this.elements[0] = x0;
		this.elements[1] = y0;
		this.elements[2] = z0;
		this.elements[3] = 0;
		this.elements[4] = x1;
		this.elements[5] = y1;
		this.elements[6] = z1;
		this.elements[7] = 0;
		this.elements[8] = x2;
		this.elements[9] = y2;
		this.elements[10] = z2;
		this.elements[11] = 0;
		this.elements[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
		this.elements[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
		this.elements[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
		this.elements[15] = 1;
	
		return this;
	}

	public translate( v: Vector3) {
		this.set(
			1, 0, 0, v.x,
			0, 1, 0, v.y,
			0, 0, 1, v.z,
			0, 0, 0, 1
		);
		return this;
	}

	public scale(v: Vector3) {
		this.set(
			v.x, 0, 0, 0,
			0, v.y, 0, 0,
			0, 0, v.z, 0,
			0, 0, 0, 1
		);

		return this;
	}
}