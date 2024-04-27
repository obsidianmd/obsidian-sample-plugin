export class Heading {
  title: string;
  hLevel: number;
  treeLevel: number;
  parent: Heading | null;

  constructor(
    title: string,
    hLevel: number,
    treeLevel: number,
    parent: Heading | null,
  ) {
    Object.assign(this, { title, hLevel, treeLevel, parent });
  }

  getParent(hLevel: number): Heading | undefined {
    return this.hLevel < hLevel ? this : this.parent?.getParent(hLevel);
  }

  toMarkdown(): string {
    return `${"\t".repeat(this.treeLevel)}- [ ] ${this.title}`;
  }
}
