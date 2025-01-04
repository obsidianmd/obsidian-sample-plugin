export default interface Layout<KO> {
	render(ko: KO, el: HTMLElement): Promise<void>;
}
