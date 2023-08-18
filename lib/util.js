// @ts-check

export const emptyBuffer = Buffer.allocUnsafe(0);
export const nullBuffer = Buffer.from([0x00]);
export const ffBuffer = Buffer.from([0xff]);

/**
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Buffer}
 */
export function bufferMin(a, b) {
	return Buffer.compare(a, b) < 0 ? a : b;
}

/**
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Buffer}
 */
export function bufferMax(a, b) {
	return Buffer.compare(a, b) > 0 ? a : b;
}

/**
 * @param {Buffer} buf
 * @returns {Buffer}
 */
export function strNext(buf) {
	return Buffer.concat([buf, nullBuffer], buf.length + 1);
}

/**
 * @param {Buffer} buf
 * @returns {Buffer}
 */
export function keyspaceEnd(buf) {
	for (let i = 0; i < buf.length; i++) {
		if (buf[i] !== 0xff) {
			const endBuf = Buffer.from(buf, 0, i + 1);

			endBuf[i] = 0xff;

			return endBuf;
		}
	}

	return Buffer.concat([buf, ffBuffer], buf.length + 1);
}
