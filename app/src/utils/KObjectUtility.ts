import ExoContext from "../../../common/ExoContext";

export default class KObjectUtility {
	constructor(private ctx: ExoContext) {
	}

	async addMissingId(): Promise<void> {
		let allMdFiles = this.ctx.vaultAdapter.getAllMdFiles();

		const KOs = allMdFiles.filter(f => {
			const tags = this.ctx.appUtils.getTagsFromFile(f);
			let isKo = tags.some(tag => tag.startsWith("TMS/") || tag.startsWith("IMS/") || tag.startsWith("EMS/") || tag.startsWith("KMS/"));
			return isKo && !f.path.startsWith("9 Meta/");
		});

		const withoutId = KOs.filter(f => {
			let frontmatter = this.ctx.appUtils.getFrontmatterOrThrow(f);
			if (!frontmatter) {
				return false;
			}

			return !frontmatter["uid"];
		})

		for (let f of withoutId) {
			await this.ctx.app.fileManager.processFrontMatter(f, (frontmatter) => {
				frontmatter['uid'] = crypto.randomUUID();
			});
		}
	}
}
