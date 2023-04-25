// syntax sugar for checking for optional numbers equal to zero (and other similar cases)
export function isDefined(o: any): boolean {
	return o !== undefined && o !== null;
}

export function last<T>(o: Array<T>): T | undefined {
	return o?.length > 0 ? o[o.length - 1] : undefined
}

export function lastPathComponent(path: string): string {
	const lastPathSeparatorIdx = (path ?? '').lastIndexOf('/')
	return lastPathSeparatorIdx >= 0 ? path.substring(lastPathSeparatorIdx + 1).trim() : path.trim()
}

export function extractParentFolderPath(path: string): string {
	const lastPathSeparatorIdx = (path ?? '').lastIndexOf('/')
	return lastPathSeparatorIdx > 0 ? path.substring(0, lastPathSeparatorIdx).trim() : ''
}
