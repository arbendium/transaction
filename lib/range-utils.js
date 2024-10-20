// @ts-check

import { emptyBuffer } from './util.js';

/**
 * @overload
 * @param {Buffer} value
 * @param {import('./types.ts').Mutation} mutation
 * @returns {Buffer}
 */
/**
 * @overload
 * @param {Buffer | undefined} value
 * @param {import('./types.ts').Mutation} mutation
 * @returns {Buffer | undefined}
 */
/**
 * @param {Buffer | undefined} value
 * @param {import('./types.ts').Mutation} mutation
 * @returns {Buffer | undefined}
 */
function applyMutation(value, mutation) {
	if (mutation === 'clear') {
		return undefined;
	}

	if (mutation[0] === 'set') {
		return mutation[1];
	}

	return value ?? emptyBuffer;
}

/**
 * @overload
 * @param {Buffer} value
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {Buffer}
 */
/**
 * @overload
 * @param {Buffer | undefined} value
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {Buffer | undefined}
 */
/**
 * @param {Buffer | undefined} value
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {Buffer | undefined}
 */
export function applyMutations(value, mutations) {
	return mutations != null
		? mutations.reduce(applyMutation, value)
		: value;
}

/**
 * @param {import('./types.ts').Mutation} mutation
 * @returns {boolean}
 */
export function isIndependentMutation(mutation) {
	return mutation === 'clear' || mutation[0] === 'set';
}

/**
 * @param {import('./types.ts').Mutation[] | undefined} mutations
 * @returns {boolean}
 */
export function includesIndependentMutation(mutations) {
	return mutations != null && mutations.some(isIndependentMutation);
}

/**
 * @param {Pick<import('./types.ts').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
export function isEmptyEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) === undefined;
}

/**
 * @param {Pick<import('./types.ts').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
export function isValueEntry(entry) {
	return isKnown(entry) && applyMutations(entry.value, entry.mutations) !== undefined;
}

/**
 * @param {Pick<import('./types.ts').RangeIndexEntry, 'value' | 'mutations'>} entry
 */
export function isKnown(entry) {
	return 'value' in entry || includesIndependentMutation(entry.mutations);
}
