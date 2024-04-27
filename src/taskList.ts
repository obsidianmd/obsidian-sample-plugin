import { Task, TaskInterface } from "src/task";

export interface TaskListInterface {
  tasks: TaskInterface[];
  parseOutline: (makdownContent: string) => void;
  toMarkdown: () => string;
}

export const TaskList = (): TaskListInterface => {
  const tasks: TaskInterface[] = [];

  const getParentTask = (taskLevel: number): TaskInterface | undefined => {
    const prevTask = tasks.at(-1);
    if (prevTask === undefined) {
      return undefined;
    }
    const sign = Math.sign(taskLevel - prevTask.standardLevel) as -1 | 0 | 1;
    switch (sign) {
      case -1:
        return prevTask.getParent(taskLevel);
      case 0:
        return prevTask.parent;
      case 1:
        return prevTask;
    }
  };

  const parseOutline = function (makdownContent: string): void {
    const lines = makdownContent
      .split(/\r?\n/)
      .filter((line) => line && line.startsWith("#"));

    for (const line of lines) {
      const taskLevel = (line.match(/^#+/) as RegExpMatchArray)[0].length;
      const parent = getParentTask(taskLevel);
      const treeLevel = parent ? parent.treeLevel + 1 : 0;
      tasks.push(
        Task(line.replace(/^#+\s*/, ""), taskLevel, treeLevel, parent),
      );
    }
  };

  const toMarkdown = () => tasks.map((task) => task.toMarkdown()).join("\r\n");

  return { tasks, parseOutline, toMarkdown };
};
