import { Geometry, GPU } from "@trident/core";

const HalfFloatType = "HalfFloatType";
const FloatType = "FloatType";

function clamp( value, min, max ) {
	return Math.max( min, Math.min( max, value ) );
}

// Fast Half Float Conversions, http://www.fox-toolkit.org/ftp/fasthalffloatconversion.pdf

const _tables = /*@__PURE__*/ _generateTables();

function _generateTables() {

	// float32 to float16 helpers

	const buffer = new ArrayBuffer( 4 );
	const floatView = new Float32Array( buffer );
	const uint32View = new Uint32Array( buffer );

	const baseTable = new Uint32Array( 512 );
	const shiftTable = new Uint32Array( 512 );

	for ( let i = 0; i < 256; ++ i ) {

		const e = i - 127;

		// very small number (0, -0)

		if ( e < - 27 ) {

			baseTable[ i ] = 0x0000;
			baseTable[ i | 0x100 ] = 0x8000;
			shiftTable[ i ] = 24;
			shiftTable[ i | 0x100 ] = 24;

			// small number (denorm)

		} else if ( e < - 14 ) {

			baseTable[ i ] = 0x0400 >> ( - e - 14 );
			baseTable[ i | 0x100 ] = ( 0x0400 >> ( - e - 14 ) ) | 0x8000;
			shiftTable[ i ] = - e - 1;
			shiftTable[ i | 0x100 ] = - e - 1;

			// normal number

		} else if ( e <= 15 ) {

			baseTable[ i ] = ( e + 15 ) << 10;
			baseTable[ i | 0x100 ] = ( ( e + 15 ) << 10 ) | 0x8000;
			shiftTable[ i ] = 13;
			shiftTable[ i | 0x100 ] = 13;

			// large number (Infinity, -Infinity)

		} else if ( e < 128 ) {

			baseTable[ i ] = 0x7c00;
			baseTable[ i | 0x100 ] = 0xfc00;
			shiftTable[ i ] = 24;
			shiftTable[ i | 0x100 ] = 24;

			// stay (NaN, Infinity, -Infinity)

		} else {

			baseTable[ i ] = 0x7c00;
			baseTable[ i | 0x100 ] = 0xfc00;
			shiftTable[ i ] = 13;
			shiftTable[ i | 0x100 ] = 13;

		}

	}

	// float16 to float32 helpers

	const mantissaTable = new Uint32Array( 2048 );
	const exponentTable = new Uint32Array( 64 );
	const offsetTable = new Uint32Array( 64 );

	for ( let i = 1; i < 1024; ++ i ) {

		let m = i << 13; // zero pad mantissa bits
		let e = 0; // zero exponent

		// normalized
		while ( ( m & 0x00800000 ) === 0 ) {

			m <<= 1;
			e -= 0x00800000; // decrement exponent

		}

		m &= ~ 0x00800000; // clear leading 1 bit
		e += 0x38800000; // adjust bias

		mantissaTable[ i ] = m | e;

	}

	for ( let i = 1024; i < 2048; ++ i ) {

		mantissaTable[ i ] = 0x38000000 + ( ( i - 1024 ) << 13 );

	}

	for ( let i = 1; i < 31; ++ i ) {

		exponentTable[ i ] = i << 23;

	}

	exponentTable[ 31 ] = 0x47800000;
	exponentTable[ 32 ] = 0x80000000;

	for ( let i = 33; i < 63; ++ i ) {

		exponentTable[ i ] = 0x80000000 + ( ( i - 32 ) << 23 );

	}

	exponentTable[ 63 ] = 0xc7800000;

	for ( let i = 1; i < 64; ++ i ) {

		if ( i !== 32 ) {

			offsetTable[ i ] = 1024;

		}

	}

	return {
		floatView: floatView,
		uint32View: uint32View,
		baseTable: baseTable,
		shiftTable: shiftTable,
		mantissaTable: mantissaTable,
		exponentTable: exponentTable,
		offsetTable: offsetTable
	};

}

/**
 * Returns a half precision floating point value (FP16) from the given single
 * precision floating point value (FP32).
 *
 * @param {number} val - A single precision floating point value.
 * @return {number} The FP16 value.
 */
function toHalfFloat( val ) {

	if ( Math.abs( val ) > 65504 ) console.warn( 'DataUtils.toHalfFloat(): Value out of range.' );

	val = clamp( val, - 65504, 65504 );

	_tables.floatView[ 0 ] = val;
	const f = _tables.uint32View[ 0 ];
	const e = ( f >> 23 ) & 0x1ff;
	return _tables.baseTable[ e ] + ( ( f & 0x007fffff ) >> _tables.shiftTable[ e ] );

}

/**
 * Returns a single precision floating point value (FP32) from the given half
 * precision floating point value (FP16).
 *
 * @param {number} val - A half precision floating point value.
 * @return {number} The FP32 value.
 */
function fromHalfFloat( val ) {

	const m = val >> 10;
	_tables.uint32View[ 0 ] = _tables.mantissaTable[ _tables.offsetTable[ m ] + ( val & 0x3ff ) ] + _tables.exponentTable[ m ];
	return _tables.floatView[ 0 ];

}

/**
 * A class containing utility functions for data.
 *
 * @hideconstructor
 */
class DataUtils {

	/**
	 * Returns a half precision floating point value (FP16) from the given single
	 * precision floating point value (FP32).
	 *
	 * @param {number} val - A single precision floating point value.
	 * @return {number} The FP16 value.
	 */
	static toHalfFloat( val ) {

		return toHalfFloat( val );

	}

	/**
	 * Returns a single precision floating point value (FP32) from the given half
	 * precision floating point value (FP16).
	 *
	 * @param {number} val - A half precision floating point value.
	 * @return {number} The FP32 value.
	 */
	static fromHalfFloat( val ) {

		return fromHalfFloat( val );

	}

}

class HDRLoader {

    private type: typeof FloatType | typeof HalfFloatType;
	/**
     * Constructs a new RGBE/HDR loader.
     *
     * @param {LoadingManager} [manager] - The loading manager.
     */
	constructor() {

		/**
         * The texture type.
         *
         * @type {(HalfFloatType|FloatType)}
         * @default HalfFloatType
         */
		this.type = HalfFloatType;

	}

	/**
     * Parses the given RGBE texture data.
     *
     * @param {ArrayBuffer} buffer - The raw texture data.
     * @return {DataTextureLoader~TexData} An object representing the parsed texture data.
     */
	parse( buffer ) {

		// adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html

		const
			/* default error routine.  change this to change error handling */
			rgbe_read_error = 1,
			rgbe_write_error = 2,
			rgbe_format_error = 3,
			rgbe_memory_error = 4,
			rgbe_error = function ( rgbe_error_code, msg? ) {

				switch ( rgbe_error_code ) {

					case rgbe_read_error: throw new Error( 'THREE.HDRLoader: Read Error: ' + ( msg || '' ) );
					case rgbe_write_error: throw new Error( 'THREE.HDRLoader: Write Error: ' + ( msg || '' ) );
					case rgbe_format_error: throw new Error( 'THREE.HDRLoader: Bad File Format: ' + ( msg || '' ) );
					default:
					case rgbe_memory_error: throw new Error( 'THREE.HDRLoader: Memory Error: ' + ( msg || '' ) );

				}

			},

			/* offsets to red, green, and blue components in a data (float) pixel */
			//RGBE_DATA_RED = 0,
			//RGBE_DATA_GREEN = 1,
			//RGBE_DATA_BLUE = 2,

			/* number of floats per pixel, use 4 since stored in rgba image format */
			//RGBE_DATA_SIZE = 4,

			/* flags indicating which fields in an rgbe_header_info are valid */
			RGBE_VALID_PROGRAMTYPE = 1,
			RGBE_VALID_FORMAT = 2,
			RGBE_VALID_DIMENSIONS = 4,

			NEWLINE = '\n',

			fgets = function ( buffer, lineLimit?, consume? ) {

				const chunkSize = 128;

				lineLimit = ! lineLimit ? 1024 : lineLimit;
				let p = buffer.pos,
					i = - 1, len = 0, s = '',
					chunk = String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

				while ( ( 0 > ( i = chunk.indexOf( NEWLINE ) ) ) && ( len < lineLimit ) && ( p < buffer.byteLength ) ) {

					s += chunk; len += chunk.length;
					p += chunkSize;
					chunk += String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

				}

				if ( - 1 < i ) {

					/*for (i=l-1; i>=0; i--) {
                        byteCode = m.charCodeAt(i);
                        if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
                        else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
                        if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
                    }*/
					if ( false !== consume ) buffer.pos += len + i + 1;
					return s + chunk.slice( 0, i );

				}

				return false;

			},

			/* minimal header reading.  modify if you want to parse more information */
			RGBE_ReadHeader = function ( buffer ) {


				// regexes to parse header info fields
				const magic_token_re = /^#\?(\S+)/,
					gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
					exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
					format_re = /^\s*FORMAT=(\S+)\s*$/,
					dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,

					// RGBE format header struct
					header = {

						valid: 0, /* indicate which fields are valid */

						string: '', /* the actual header string */

						comments: '', /* comments found in header */

						programtype: 'RGBE', /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */

						format: '', /* RGBE format, default 32-bit_rle_rgbe */

						gamma: 1.0, /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */

						exposure: 1.0, /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */

						width: 0, height: 0 /* image dimensions, width/height */

					};

				let line, match;

				if ( buffer.pos >= buffer.byteLength || ! ( line = fgets( buffer ) ) ) {

					rgbe_error( rgbe_read_error, 'no header found' );

				}

				/* if you want to require the magic token then uncomment the next line */
				if ( ! ( match = line.match( magic_token_re ) ) ) {

					rgbe_error( rgbe_format_error, 'bad initial token' );

				}

				header.valid |= RGBE_VALID_PROGRAMTYPE;
				header.programtype = match[ 1 ];
				header.string += line + '\n';

				while ( true ) {

					line = fgets( buffer );
					if ( false === line ) break;
					header.string += line + '\n';

					if ( '#' === line.charAt( 0 ) ) {

						header.comments += line + '\n';
						continue; // comment line

					}

					if ( match = line.match( gamma_re ) ) {

						header.gamma = parseFloat( match[ 1 ] );

					}

					if ( match = line.match( exposure_re ) ) {

						header.exposure = parseFloat( match[ 1 ] );

					}

					if ( match = line.match( format_re ) ) {

						header.valid |= RGBE_VALID_FORMAT;
						header.format = match[ 1 ];//'32-bit_rle_rgbe';

					}

					if ( match = line.match( dimensions_re ) ) {

						header.valid |= RGBE_VALID_DIMENSIONS;
						header.height = parseInt( match[ 1 ], 10 );
						header.width = parseInt( match[ 2 ], 10 );

					}

					if ( ( header.valid & RGBE_VALID_FORMAT ) && ( header.valid & RGBE_VALID_DIMENSIONS ) ) break;

				}

				if ( ! ( header.valid & RGBE_VALID_FORMAT ) ) {

					rgbe_error( rgbe_format_error, 'missing format specifier' );

				}

				if ( ! ( header.valid & RGBE_VALID_DIMENSIONS ) ) {

					rgbe_error( rgbe_format_error, 'missing image size specifier' );

				}

				return header;

			},

			RGBE_ReadPixels_RLE = function ( buffer, w, h ) {

				const scanline_width = w;

				if (
				// run length encoding is not allowed so read flat
					( ( scanline_width < 8 ) || ( scanline_width > 0x7fff ) ) ||
                    // this file is not run length encoded
                    ( ( 2 !== buffer[ 0 ] ) || ( 2 !== buffer[ 1 ] ) || ( buffer[ 2 ] & 0x80 ) )
				) {

					// return the flat buffer
					return new Uint8Array( buffer );

				}

				if ( scanline_width !== ( ( buffer[ 2 ] << 8 ) | buffer[ 3 ] ) ) {

					rgbe_error( rgbe_format_error, 'wrong scanline width' );

				}

				const data_rgba = new Uint8Array( 4 * w * h );

				if ( ! data_rgba.length ) {

					rgbe_error( rgbe_memory_error, 'unable to allocate buffer space' );

				}

				let offset = 0, pos = 0;

				const ptr_end = 4 * scanline_width;
				const rgbeStart = new Uint8Array( 4 );
				const scanline_buffer = new Uint8Array( ptr_end );
				let num_scanlines = h;

				// read in each successive scanline
				while ( ( num_scanlines > 0 ) && ( pos < buffer.byteLength ) ) {

					if ( pos + 4 > buffer.byteLength ) {

						rgbe_error( rgbe_read_error );

					}

					rgbeStart[ 0 ] = buffer[ pos ++ ];
					rgbeStart[ 1 ] = buffer[ pos ++ ];
					rgbeStart[ 2 ] = buffer[ pos ++ ];
					rgbeStart[ 3 ] = buffer[ pos ++ ];

					if ( ( 2 != rgbeStart[ 0 ] ) || ( 2 != rgbeStart[ 1 ] ) || ( ( ( rgbeStart[ 2 ] << 8 ) | rgbeStart[ 3 ] ) != scanline_width ) ) {

						rgbe_error( rgbe_format_error, 'bad rgbe scanline format' );

					}

					// read each of the four channels for the scanline into the buffer
					// first red, then green, then blue, then exponent
					let ptr = 0, count;

					while ( ( ptr < ptr_end ) && ( pos < buffer.byteLength ) ) {

						count = buffer[ pos ++ ];
						const isEncodedRun = count > 128;
						if ( isEncodedRun ) count -= 128;

						if ( ( 0 === count ) || ( ptr + count > ptr_end ) ) {

							rgbe_error( rgbe_format_error, 'bad scanline data' );

						}

						if ( isEncodedRun ) {

							// a (encoded) run of the same value
							const byteValue = buffer[ pos ++ ];
							for ( let i = 0; i < count; i ++ ) {

								scanline_buffer[ ptr ++ ] = byteValue;

							}
							//ptr += count;

						} else {

							// a literal-run
							scanline_buffer.set( buffer.subarray( pos, pos + count ), ptr );
							ptr += count; pos += count;

						}

					}


					// now convert data from buffer into rgba
					// first red, then green, then blue, then exponent (alpha)
					const l = scanline_width; //scanline_buffer.byteLength;
					for ( let i = 0; i < l; i ++ ) {

						let off = 0;
						data_rgba[ offset ] = scanline_buffer[ i + off ];
						off += scanline_width; //1;
						data_rgba[ offset + 1 ] = scanline_buffer[ i + off ];
						off += scanline_width; //1;
						data_rgba[ offset + 2 ] = scanline_buffer[ i + off ];
						off += scanline_width; //1;
						data_rgba[ offset + 3 ] = scanline_buffer[ i + off ];
						offset += 4;

					}

					num_scanlines --;

				}

				return data_rgba;

			};

		const RGBEByteToRGBFloat = function ( sourceArray, sourceOffset, destArray, destOffset ) {

			const e = sourceArray[ sourceOffset + 3 ];
			const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

			destArray[ destOffset + 0 ] = sourceArray[ sourceOffset + 0 ] * scale;
			destArray[ destOffset + 1 ] = sourceArray[ sourceOffset + 1 ] * scale;
			destArray[ destOffset + 2 ] = sourceArray[ sourceOffset + 2 ] * scale;
			destArray[ destOffset + 3 ] = 1;

		};

		const RGBEByteToRGBHalf = function ( sourceArray, sourceOffset, destArray, destOffset ) {

			const e = sourceArray[ sourceOffset + 3 ];
			const scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

			// clamping to 65504, the maximum representable value in float16
			destArray[ destOffset + 0 ] = DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 0 ] * scale, 65504 ) );
			destArray[ destOffset + 1 ] = DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 1 ] * scale, 65504 ) );
			destArray[ destOffset + 2 ] = DataUtils.toHalfFloat( Math.min( sourceArray[ sourceOffset + 2 ] * scale, 65504 ) );
			destArray[ destOffset + 3 ] = DataUtils.toHalfFloat( 1 );

		};

		const byteArray = new Uint8Array( buffer );
		byteArray.pos = 0;
		const rgbe_header_info = RGBE_ReadHeader( byteArray );

		const w = rgbe_header_info.width,
			h = rgbe_header_info.height,
			image_rgba_data = RGBE_ReadPixels_RLE( byteArray.subarray( byteArray.pos ), w, h );


		let data, type;
		let numElements;

		switch ( this.type ) {

			case FloatType:
                console.log("FloatType");
				numElements = image_rgba_data.length / 4;
				const floatArray = new Float32Array( numElements * 4 );

				for ( let j = 0; j < numElements; j ++ ) {

					RGBEByteToRGBFloat( image_rgba_data, j * 4, floatArray, j * 4 );

				}

				data = floatArray;
				type = FloatType;
				break;

			case HalfFloatType:
                console.log("HalfFloatType");
				numElements = image_rgba_data.length / 4;
				const halfArray = new Uint16Array( numElements * 4 );

				for ( let j = 0; j < numElements; j ++ ) {

					RGBEByteToRGBHalf( image_rgba_data, j * 4, halfArray, j * 4 );

				}

				data = halfArray;
				type = HalfFloatType;
				break;

			default:

				throw new Error( 'THREE.HDRLoader: Unsupported type: ' + this.type );

		}

		return {
			width: w, height: h,
			data: data,
			header: rgbe_header_info.string,
			gamma: rgbe_header_info.gamma,
			exposure: rgbe_header_info.exposure,
			type: type
		};

	}

	/**
     * Sets the texture type.
     *
     * @param {(HalfFloatType|FloatType)} value - The texture type to set.
     * @return {HDRLoader} A reference to this loader.
     */
	setDataType( value ) {

		this.type = value;
		return this;

	}

	load( url, onLoad, onProgress, onError ) {

		function onLoadCallback( texture, texData ) {

			switch ( texture.type ) {

				case FloatType:
				case HalfFloatType:

					texture.colorSpace = LinearSRGBColorSpace;
					texture.minFilter = LinearFilter;
					texture.magFilter = LinearFilter;
					texture.generateMipmaps = false;
					texture.flipY = true;

					break;

			}

			if ( onLoad ) onLoad( texture, texData );

		}

		return super.load( url, onLoadCallback, onProgress, onError );

	}

}




export class HDRParser {
    private static radiancePattern = "#\\?RADIANCE";
    private static commentPattern = "#.*";
    private static exposurePattern = "EXPOSURE=\\s*([0-9]*[.][0-9]*)";
    private static formatPattern = "FORMAT=32-bit_rle_rgbe";
    private static widthHeightPattern = "-Y ([0-9]+) \\+X ([0-9]+)";

    private static ImageFormat: GPU.TextureFormat = "rgba16float";

    private static readPixelsRawRLE(buffer: Uint8Array, data: Uint8Array, offset: number, fileOffset: number, scanlineWidth: number, scanlinesCount: number) {
        const rgbe = new Array<number>(4);
        let scanlineBuffer: number[] | null = null;
        let ptr;
        let ptr_end;
        let count;
        const twoBytes = new Array<number>(2);
        const bufferLength = buffer.length;

        function readBuf(buf: Uint8Array | number[]) {
            let bytesRead = 0;
            do {
                buf[bytesRead++] = buffer[fileOffset];
                fileOffset += 1;
            } while (fileOffset < bufferLength && bytesRead < buf.length);
            return bytesRead;
        }

        function readBufferOffset(
            buf: Uint8Array | number[],
            offset: number,
            length: number,
        ) {
            let bytesRead = 0;
            do {
                buf[offset + bytesRead] = buffer[fileOffset];
                bytesRead += 1;
                fileOffset += 1;
            } while (fileOffset < bufferLength && bytesRead < length);
            return bytesRead;
        }

        function readPixelsRaw(data: Uint8Array, offset: number, numpixels: number) {
            const numExpected = 4 * numpixels;
            let readCount = readBufferOffset(data, offset, numExpected);
            if (readCount < numExpected) {
                throw new Error(
                    "Error reading raw pixels: got " +
                    readCount +
                    " bytes, expected " +
                    numExpected,
                );
            }
        }

        while (scanlinesCount > 0) {
            if (readBuf(rgbe) < rgbe.length) {
                throw new Error("Error reading bytes: expected " + rgbe.length);
            }

            if (rgbe[0] != 2 || rgbe[1] != 2 || (rgbe[2] & 0x80) != 0) {
                //this file is not run length encoded
                data[offset + 0] = rgbe[0];
                data[offset + 1] = rgbe[1];
                data[offset + 2] = rgbe[2];
                data[offset + 3] = rgbe[3];
                offset += 4;
                readPixelsRaw(data, offset, scanlineWidth * scanlinesCount - 1);
                return;
            }

            if ((((rgbe[2] & 0xff) << 8) | (rgbe[3] & 0xff)) != scanlineWidth) {
                throw new Error(
                    "Wrong scanline width " +
                    (((rgbe[2] & 0xff) << 8) | (rgbe[3] & 0xff)) +
                    ", expected " +
                    scanlineWidth,
                );
            }

            if (scanlineBuffer == null) {
                scanlineBuffer = new Array<number>(4 * scanlineWidth);
            }

            ptr = 0;
            // Read each of the four channels for the scanline into the buffer.
            for (let i = 0; i < 4; i += 1) {
                ptr_end = (i + 1) * scanlineWidth;
                while (ptr < ptr_end) {
                    if (readBuf(twoBytes) < twoBytes.length) {
                        throw new Error("Error reading 2-byte buffer");
                    }
                    if ((twoBytes[0] & 0xff) > 128) {
                        /* a run of the same value */
                        count = (twoBytes[0] & 0xff) - 128;
                        if (count == 0 || count > ptr_end - ptr) {
                            throw new Error("Bad scanline data");
                        }
                        while (count-- > 0) {
                            scanlineBuffer[ptr++] = twoBytes[1];
                        }
                    } else {
                        /* a non-run */
                        count = twoBytes[0] & 0xff;
                        if (count == 0 || count > ptr_end - ptr) {
                            throw new Error("Bad scanline data");
                        }
                        scanlineBuffer[ptr++] = twoBytes[1];
                        if (--count > 0) {
                            if (readBufferOffset(scanlineBuffer, ptr, count) < count) {
                                throw new Error("Error reading non-run data");
                            }
                            ptr += count;
                        }
                    }
                }
            }

            for (let i = 0; i < scanlineWidth; i += 1) {
                data[offset + 0] = scanlineBuffer[i];
                data[offset + 1] = scanlineBuffer[i + scanlineWidth];
                data[offset + 2] = scanlineBuffer[i + 2 * scanlineWidth];
                data[offset + 3] = scanlineBuffer[i + 3 * scanlineWidth];
                offset += 4;
            }

            scanlinesCount -= 1;
        }
    }


    public static async Load(url: string): Promise<GPU.RenderTexture> {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);




        {
            const l = new HDRLoader();
            l.setDataType(HalfFloatType)
            const d = l.parse(buffer);
            console.log(d)
    
            const dstHDR = GPU.RenderTexture.Create(d.width, d.height, 1, HDRParser.ImageFormat);
            dstHDR.SetData(d.data, d.width * 8);
            return dstHDR;
        }


        let fileOffset = 0;
        const bufferLength = buffer.length;

        const NEW_LINE = 10;

        function readLine() {
            let line = "";
            while (++fileOffset < bufferLength) {
                let b = buffer[fileOffset];
                if (b == NEW_LINE) {
                    fileOffset += 1;
                    break;
                }
                line += String.fromCharCode(b);
            }
            return line;
        }

        let width = 0;
        let height = 0;
        let exposure = 1;
        let rle = false;

        for (let i = 0; i < 20; i += 1) {
            let line = readLine();
            let match;
            if ((match = line.match(HDRParser.radiancePattern))) {
            } else if ((match = line.match(HDRParser.formatPattern))) {
                rle = true;
            } else if ((match = line.match(HDRParser.exposurePattern))) {
                exposure = Number(match[1]);
            } else if ((match = line.match(HDRParser.commentPattern))) {
            } else if ((match = line.match(HDRParser.widthHeightPattern))) {
                height = Number(match[1]);
                width = Number(match[2]);
                break;
            }
        }

        let data = new Uint8Array(width * height * 4);
        let scanlineWidth = width;
        let scanlinesCount = height;

        HDRParser.readPixelsRawRLE(buffer, data, 0, fileOffset, scanlineWidth, scanlinesCount);


        function acesToneMapping(x: number): number {
            const a = 2.51;
            const b = 0.03;
            const c = 2.43;
            const d = 0.59;
            const e = 0.14;
            // Same structure as WGSL: max(0, ...)
            const y = (x * (a * x + b)) / (x * (c * x + d) + e);
            return Math.max(0, y);
        }

        function linearToSRGB(linearValue: number): number {
            // IMPORTANT: clamp to avoid NaN from pow(negative, frac)
            const v = Math.max(0, linearValue);
            if (v <= 0.0031308) return 12.92 * v;
            return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        }

        // Use the parsed header exposure if you want, and/or allow user exposure
        const exposureMul = exposure; // or exposure * userExposure

        let floatData = new Float16Array(width * height * 4);

        for (let offset = 0; offset < data.length; offset += 4) {
            let r = data[offset + 0] / 255;
            let g = data[offset + 1] / 255;
            let b = data[offset + 2] / 255;
            const e = data[offset + 3];

            // RGBE -> linear HDR scale
            const scale = Math.pow(2.0, e - 128.0);
            r *= scale;
            g *= scale;
            b *= scale;

            // === Match WGSL pipeline ===
            r *= exposureMul;
            g *= exposureMul;
            b *= exposureMul;

            r = acesToneMapping(r);
            g = acesToneMapping(g);
            b = acesToneMapping(b);

            // r = linearToSRGB(r);
            // g = linearToSRGB(g);
            // b = linearToSRGB(b);

            // Store (sRGB in float16)
            const i = offset; // same indexing since offset steps by 4
            floatData[i + 0] = r;
            floatData[i + 1] = g;
            floatData[i + 2] = b;
            floatData[i + 3] = 1.0;
        }

        const dstHDR = GPU.RenderTexture.Create(width, height, 1, HDRParser.ImageFormat);
        dstHDR.SetData(floatData, width * 8);
        return dstHDR;
    }

    public static async ToCubemap(hdr: GPU.Texture): Promise<GPU.RenderTextureCube> {
        const faceSize = Math.min((hdr.width / 2) | 0, hdr.height | 0);
        const renderTarget = GPU.RenderTextureCube.Create(faceSize, faceSize, 6, "rgba16float");
        renderTarget.name = "Skybox";

        const hdrSampler = GPU.TextureSampler.Create({
            minFilter: "linear", magFilter: "linear", mipmapFilter: "linear",
            addressModeU: "repeat", addressModeV: "clamp-to-edge",
        });

        const geometry = Geometry.Plane();
        const shader = await GPU.Shader.Create({
            code: /* wgsl */`
            @group(0) @binding(1) var hdrTexture: texture_2d<f32>;
            @group(0) @binding(2) var hdrSampler: sampler;
      
            @group(0) @binding(3) var<storage, read> face: vec4<f32>;
      
            struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
      
            @vertex
            fn vertexMain(@location(0) position: vec3f) -> VSOut {
                var o: VSOut;
                o.pos = vec4f(position.xy, 0.0, 1.0);
                o.uv  = position.xy; // [-1,1]
                return o;
            }
      
  fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
      let u = x;
      let v = y;
      switch face {
          case 0u { return normalize(vec3( 1.0,  v, -u)); } // +X
          case 1u { return normalize(vec3(-1.0,  v,  u)); } // -X
          case 2u { return normalize(vec3( u,  1.0, -v)); } // +Y
          case 3u { return normalize(vec3( u, -1.0,  v)); } // -Y
          case 4u { return normalize(vec3( u,  v,  1.0)); } // +Z
          default { return normalize(vec3(-u,  v, -1.0)); } // -Z
      }
  }
      
            const invAtan = vec2f(0.15915494309189535, 0.3183098861837907);
      
        fn sampleSphericalMap(v: vec3f) -> vec2f {
            var st = vec2f(atan2(v.z, v.x), asin(v.y));
            st *= invAtan;
            st = vec2f(st.x + 0.5, 1.0 - (st.y + 0.5)); // flip Y here
            return st;
        }
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                let dir = dirFromFaceUV(u32(face.x), uv.x, uv.y);
                let st  = sampleSphericalMap(dir);
                let col = textureSample(hdrTexture, hdrSampler, st).rgb;
                return vec4f(col, 1.0);
            }
          `,
            colorOutputs: [{ format: renderTarget.format }],
            attributes: { position: { location: 0, size: 3, type: "vec3" } },
            uniforms: {
                hdrTexture: { group: 0, binding: 1, type: "texture" },
                hdrSampler: { group: 0, binding: 2, type: "sampler" },
                face: { group: 0, binding: 3, type: "storage" },
            }
        });

        const params = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);

        shader.SetTexture("hdrTexture", hdr);
        shader.SetSampler("hdrSampler", hdrSampler);
        shader.SetBuffer("face", params);

        for (let face = 0; face < 6; face++) {
            params.SetArray(new Float32Array([face, 0, 0, 0]));

            GPU.Renderer.BeginRenderFrame();
            renderTarget.SetActiveLayer(face);
            GPU.RendererContext.BeginRenderPass(`EquirectToCubeFace_${face}`, [{ target: renderTarget, clear: true }]);
            GPU.RendererContext.DrawGeometry(geometry, shader);
            GPU.RendererContext.EndRenderPass();
            GPU.Renderer.EndRenderFrame();
        }

        renderTarget.GenerateMips();
        return renderTarget;
    }
}
