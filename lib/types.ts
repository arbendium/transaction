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
