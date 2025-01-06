// syntax sugar for checking for optional numbers equal to zero (and other similar cases)
export function isDefined(o: any): boolean {
	return o !== undefined && o !== null;
}

export function last<T>(o: Array<T>): T | undefined {
	return o?.length > 0 ? o[o.length - 1] : undefined
}

export function lastPathComponent(path: string): string {
	const lastPathSeparatorIdx = (path ?? '').lastIndexOf('/')
	return lastPathSeparatorIdx >= 0 ? path.substring(lastPathSeparatorIdx + 1) : path
}

export function extractParentFolderPath(path: string): string {
	const lastPathSeparatorIdx = (path ?? '').lastIndexOf('/')
	return lastPathSeparatorIdx > 0 ? path.substring(0, lastPathSeparatorIdx) : ''
}

export function extractBasename (configEntry: string | undefined): string | undefined {
	if (typeof configEntry === 'string' && configEntry.endsWith('.md')) {
		return configEntry.slice(0, -'.md'.length)
	} else {
		return configEntry
	}
}

export class ValueOrError<V,E> {
	constructor(private value?: V, private error?: E) {
		if (value) this.error = undefined
	}
	public setValue(value: V): ValueOrError<V,E> {
		this.value = value
		this.error = undefined
		return this
	}
	public setError(error: E): ValueOrError<V,E> {
		this.value = undefined
		this.error = error
		return this
	}
	public get v() {
		return this.value
	}
	public get e() {
		return this.error
	}
}
