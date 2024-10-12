export type Value = Buffer
export type MutationOperator = 'set'
export type Mutation = [MutationOperator, Buffer] | 'clear'
export type KeySelector = { key: Buffer, inclusive: boolean, offset: number }
export type RangeIndexEntry = {
	mutations: Mutation[] | undefined
	promise: Promise<Value> | undefined
	readConflict: boolean
	value?: Value | undefined
	writeConflict: boolean
}
export type RangeIndexAction =
	| ['setPromise', Promise<Value>]
	| ['setValue', Value]
	| 'setReadConflict'
	| 'setWriteConflict'
	| ['addMutation', Mutation]
