import { DataValidator } from './validator';

export class MarkdownConverter {
    /**
     * Convert Markdown to Notion blocks
     */
    static convertToNotionBlocks(markdown: string, handleDeepLists: 'convert' | 'skip' | 'keep' = 'keep'): any[] {
        const blocks: any[] = [];
        const listStack: any[] = [];
        let previousLevel = 0;
        let inList = false;  // 添加标志来跟踪是否在列表中

        const lines = markdown.split('\n');
        for (const line of lines) {
            const listMatch = line.match(/^(\s*|\t*)([-*+])\s(.+)/);
            if (listMatch) {
                inList = true;
                const [, indent, , content] = listMatch;
                const level = indent.replace(/\t/g, '    ').length / 4;

                // 创建列表项
                const listItem = {
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: content.trim()
                            }
                        }]
                    }
                };

                if (level === 0) {
                    blocks.push(listItem);
                    listStack.length = 0;
                    listStack.push(listItem);
                } else {
                    // 子列表项处理
                    if (level > previousLevel) {
                        const parent = listStack[listStack.length - 1];
                        if (!parent.bulleted_list_item.children) {
                            parent.bulleted_list_item.children = [];
                        }
                        parent.bulleted_list_item.children.push(listItem);
                        listStack.push(listItem);
                    } else if (level === previousLevel && listStack.length > 1) {
                        const parent = listStack[listStack.length - 2];
                        if (!parent.bulleted_list_item.children) {
                            parent.bulleted_list_item.children = [];
                        }
                        parent.bulleted_list_item.children.push(listItem);
                        listStack[listStack.length - 1] = listItem;
                    } else {
                        while (listStack.length > level) {
                            listStack.pop();
                        }
                        const parent = listStack[listStack.length - 1];
                        if (!parent.bulleted_list_item.children) {
                            parent.bulleted_list_item.children = [];
                        }
                        parent.bulleted_list_item.children.push(listItem);
                        listStack.push(listItem);
                    }
                }
                previousLevel = level;
            } else {
                // 非列表内容
                if (inList) {
                    // 如果之前在列表中，重置列表相关状态
                    listStack.length = 0;
                    previousLevel = 0;
                    inList = false;
                }

                const trimmedLine = line.trim();
                if (trimmedLine) {  // 只处理非空行
                    // 处理标题
                    const headingMatch = line.match(/^(#{1,6})\s(.+)/);
                    if (headingMatch) {
                        const level = headingMatch[1].length;
                        const content = headingMatch[2];
                        blocks.push({
                            type: `heading_${level}`,
                            [`heading_${level}`]: {
                                rich_text: [{
                                    type: "text",
                                    text: {
                                        content: content.trim()
                                    }
                                }]
                            }
                        });
                    } else {
                        // 处理普通段落
                        blocks.push({
                            type: 'paragraph',
                            paragraph: {
                                rich_text: [{
                                    type: "text",
                                    text: {
                                        content: trimmedLine
                                    }
                                }]
                            }
                        });
                    }
                }
            }
        }

        return blocks;
    }
} 