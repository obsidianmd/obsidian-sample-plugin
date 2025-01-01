import ExoContext from "../../../../common/ExoContext";

export default interface ExoCommand {
	name: string;
	slug: string;

	execute(ctx: ExoContext): Promise<void>;
}
