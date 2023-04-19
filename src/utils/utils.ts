// syntax sugar for checking for optional numbers equal to zero (and other similar cases)
export function isDefined(o: any): boolean {
	return o !== undefined && o !== null;
}

export function last<T>(o: Array<T>): T | undefined {
	return o?.length > 0 ? o[o.length - 1] : undefined
}

export function lastPathComponent(path: string): string {
	const pathComponents = (path ?? '').split('/')
	return pathComponents.pop()!
}
