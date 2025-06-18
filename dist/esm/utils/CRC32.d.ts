export declare class CRC32 {
    /**
     * Lookup table calculated for 0xEDB88320 divisor
     */
    private static lookupTable;
    private static calculateBytes;
    private static crcToUint;
    private static toUint32;
    static forBytes(bytes: Uint8Array): number;
}
