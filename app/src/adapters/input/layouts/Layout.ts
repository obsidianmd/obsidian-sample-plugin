export default interface Layout<KO> {
	render(ko: KO): Promise<HTMLElement>;
}
