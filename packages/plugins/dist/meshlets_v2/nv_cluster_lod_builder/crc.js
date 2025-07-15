export function crc32V2(data) {
    const table = (function () {
        let c;
        let table = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c >>> 0;
        }
        return table;
    })();
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}
export function toFixed(num, digits = 4) {
    if (Object.is(num, -0)) {
        return '-' + Math.abs(num).toFixed(digits);
        // return (0).toFixed(digits);
    }
    return num.toFixed(digits);
}
export function crc32V2Float(data, precision = 4) {
    const table = (function () {
        let c;
        let table = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c >>> 0;
        }
        return table;
    })();
    let crc = 0 ^ (-1);
    // Serialize floats to strings with fixed decimal places
    let serializedData = '';
    for (let i = 0; i < data.length; i++) {
        // if (Object.is(data[i], -0)) serializedData += "-"; // (-0).toFixed(precision) = 0.000...
        // serializedData += data[i].toFixed(precision);
        serializedData += toFixed(data[i], precision);
    }
    // Convert serialized string to bytes
    const encoder = new TextEncoder(); // UTF-8 encoding
    const bytes = encoder.encode(serializedData);
    // Process each byte for CRC32
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}
export function checksum(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] / (i + 1);
    }
    return sum;
}
