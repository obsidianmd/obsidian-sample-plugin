export interface TaskInterface {
  title: string;
  standardLevel: number;
  treeLevel: number;
  parent?: TaskInterface;
  getParent: (targetLevel: number) => TaskInterface | undefined;
  toMarkdown: () => string;
}

export const Task = (
  title: string,
  standardLevel: number,
  treeLevel: number,
  parent: TaskInterface | undefined,
): TaskInterface => {
  const getParent = (targetLevel: number) =>
    standardLevel < targetLevel
      ? Task(title, standardLevel, treeLevel, parent) // this
      : parent?.getParent(targetLevel);

  const toMarkdown = () => `${"\t".repeat(treeLevel)}- [ ] ${title}`;

  return {
    title,
    standardLevel,
    treeLevel,
    parent,
    getParent,
    toMarkdown,
  };
};
