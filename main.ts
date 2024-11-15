import { Plugin } from 'obsidian';

export default class LineConverterPlugin extends Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor('line', async (source, el, ctx) => {
            const convertedText = processLineBlock(source);
            el.createEl('pre').setText(convertedText);
        });
    }
}

function processLineBlock(source: string): string {
    const lines = source.split('\n');
    const outputLines = [];
    let prevIndentLevel = 0;
    let listCounters: number[] = [];
    let previousListType = '';

    for (let line of lines) {
        // Determine indentation level
        const indentMatch = line.match(/^(\t+|\s+)/);
        let indentLevel = 0;
        if (indentMatch) {
            const indent = indentMatch[1];
            // For simplicity, consider each tab or 4 spaces as one indent level
            const tabCount = (indent.match(/\t/g) || []).length;
            const spaceCount = (indent.match(/ /g) || []).length;
            indentLevel = tabCount + Math.floor(spaceCount / 4);
            // Remove leading indentation
            line = line.substring(indent.length);
        }

        // Now line has no leading indentation

        // Handle headings
        if (line.startsWith('# ')) {
            line = line.replace(/^# (.*)$/, '【 $1 】');
            outputLines.push(line);
            continue;
        } else if (line.startsWith('## ')) {
            line = line.replace(/^## (.*)$/, '▋$1');
            outputLines.push(line);
            continue;
        }

        // Check for list items
        let listItemMatch;
        let isListItem = false;
        let bullet = '';
        let content = '';
        let listType = '';

        if (listItemMatch = line.match(/^- \[ \] (.*)/)) {
            // Unchecked task
            bullet = '🟩 ';
            content = listItemMatch[1];
            isListItem = true;
            listType = 'task';
        } else if (listItemMatch = line.match(/^- \[x\] (.*)/)) {
            // Checked task
            bullet = '✅ ';
            content = listItemMatch[1];
            isListItem = true;
            listType = 'task';
        } else if (listItemMatch = line.match(/^\d+\.\s+(.*)/)) {
            // Ordered list item
            bullet = ''; // numbering will be generated
            content = listItemMatch[1];
            isListItem = true;
            listType = 'ordered';
        } else if (listItemMatch = line.match(/^- (.*)/)) {
            // Unordered list item
            bullet = ''; // numbering will be generated
            content = listItemMatch[1];
            isListItem = true;
            listType = 'unordered';
        }

        if (isListItem) {
            // Handle list type change
            if (listType !== previousListType && indentLevel === 0) {
                // Reset counters when switching list types at top level
                listCounters = [];
                prevIndentLevel = 0;
            }
            previousListType = listType;

            // Handle indent level
            if (indentLevel > prevIndentLevel) {
                // Entering new sublist level
                listCounters.push(0);
            } else if (indentLevel < prevIndentLevel) {
                // Exiting to higher level(s)
                while (listCounters.length > indentLevel) {
                    listCounters.pop();
                }
            }

            // At this point, listCounters.length == indentLevel + 1

            // Increment counter at current level
            if (listCounters.length == 0) {
                listCounters.push(1);
            } else {
                listCounters[listCounters.length - 1]++;
            }

            // Reset counters for deeper levels
            for (let i = listCounters.length; i < indentLevel + 1; i++) {
                listCounters.push(1);
            }

            // Generate numbering
            let numbering = listCounters.join('.');

            // Apply formatting to content
            content = applyFormatting(content);

            if (bullet === '🟩 ' || bullet === '✅ ') {
                // For top-level tasks, include bullet before numbering
                numbering = bullet + numbering + '. ' + content;
            } else {
                numbering = numbering + '. ' + content;
            }

            // Add to output
            outputLines.push(numbering);

            prevIndentLevel = indentLevel;
            continue;
        } else {
            // Not a list item

            // Reset listCounters and prevIndentLevel if necessary
            listCounters = [];
            prevIndentLevel = 0;
            previousListType = '';

            // Apply formatting replacements to the line
            line = applyFormatting(line);

            outputLines.push(line);
        }
    }

    return outputLines.join('\n');
}

function applyFormatting(text: string): string {
    if (text.includes('**')) {
        // Replace **bold** with  *bold*  (with spaces)
        text = text.replace(/\*\*(.*?)\*\*/g, ' *$1* ');
    } else if (text.includes('*')) {
        // Replace *italic* with  _italic_ 
        text = text.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, ' _$1_ ');
    }
    // Replace ~~strike~~ with  ~strike~ 
    text = text.replace(/~~(.*?)~~/g, ' ~$1~ ');
    if (text.includes('==')) {
        // Replace ==emphasize== with  `emphasize` 
        text = text.replace(/==(.*?)==/g, ' `$1` ');
    } else if (text.includes('`')) {
        // Replace `quote` with  {quote} 
        text = text.replace(/`(.*?)`/g, ' {$1} ');
    }
    return text;
}
