export type MutationOperator = 'set'
export type Mutation = [MutationOperator, Buffer] | 'clear'
export type KeySelector<T = Buffer> = { key: T, inclusive: boolean, offset: number }
export type RangeIndexEntry = {
	mutations: Mutation[] | undefined
	promise: Promise<Buffer | undefined> | undefined
	readConflict: boolean
	value?: Buffer | undefined | undefined
	writeConflict: boolean
}
export type RangeIndexAction =
	| ['setPromise', Promise<Buffer | undefined>]
	| ['setValue', Buffer | undefined]
	| 'setReadConflict'
	| 'setWriteConflict'
	| ['addMutation', Mutation]

export interface Backend {
	get(key: Buffer, addConflict: boolean): Promise<Buffer | undefined>
	getRange(
		start: Buffer,
		startInclusive: boolean,
		startOffset: number,
		end: Buffer,
		endInclusive: boolean,
		endOffset: number,
		limit: number,
		reverse: boolean,
		addConflict: boolean
	): Promise<[Buffer, Buffer][]>
	getKey(key: Buffer, inclusive: boolean, offset: number, addConflict: boolean): Promise<Buffer>
	set(key: Buffer, value: Buffer, addConflict: boolean): void
	clear(key: Buffer, addConflict: boolean): void
	clearRange(start: Buffer, end: Buffer, addConflict: boolean): void
	addReadConflictRange(start: Buffer, end: Buffer): void
	addWriteConflictRange(start: Buffer, end: Buffer): void
}
