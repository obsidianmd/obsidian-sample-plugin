"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var obsidian_1 = require("obsidian");
var LineConverterPlugin = /** @class */ (function (_super) {
    __extends(LineConverterPlugin, _super);
    function LineConverterPlugin() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LineConverterPlugin.prototype.onload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.registerMarkdownCodeBlockProcessor('line', function (source, el, ctx) { return __awaiter(_this, void 0, void 0, function () {
                    var convertedText, codeBlockEl, codeBlockHeader, copyButton, codeBlockContent, preEl, codeEl;
                    return __generator(this, function (_a) {
                        convertedText = processLineBlock(source);
                        codeBlockEl = el.createEl('div', { cls: 'code-block is-loaded' });
                        codeBlockHeader = codeBlockEl.createEl('div', { cls: 'code-block-header' });
                        copyButton = codeBlockHeader.createEl('div', { cls: 'copy-code-button clickable-icon' });
                        (0, obsidian_1.setIcon)(copyButton, 'copy');
                        // Add event listener to copy the content to the clipboard
                        copyButton.addEventListener('click', function () {
                            navigator.clipboard.writeText(convertedText).then(function () {
                                // Provide feedback to the user
                                copyButton.addClass('mod-copied');
                                setTimeout(function () { return copyButton.removeClass('mod-copied'); }, 1500);
                                // Show a notification to the user
                                new obsidian_1.Notice('Copied to clipboard!');
                            });
                        });
                        codeBlockContent = codeBlockEl.createEl('div', { cls: 'code-block-content' });
                        preEl = codeBlockContent.createEl('pre');
                        codeEl = preEl.createEl('code');
                        codeEl.setText(convertedText);
                        // Append the code block to the element
                        el.appendChild(codeBlockEl);
                        return [2 /*return*/];
                    });
                }); });
                return [2 /*return*/];
            });
        });
    };
    return LineConverterPlugin;
}(obsidian_1.Plugin));
exports.default = LineConverterPlugin;
function processLineBlock(source) {
    var lines = source.split('\n');
    var outputLines = [];
    var prevIndentLevel = 0;
    var listCounters = [];
    var topLevelCounter = 0;
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        // Determine indentation level
        var indentMatch = line.match(/^(\t+|\s+)/);
        var indentLevel = 0;
        if (indentMatch) {
            var indent = indentMatch[1];
            // For simplicity, consider each tab or 4 spaces as one indent level
            var tabCount = (indent.match(/\t/g) || []).length;
            var spaceCount = (indent.match(/ /g) || []).length;
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
        }
        else if (line.startsWith('## ')) {
            line = line.replace(/^## (.*)$/, '▋$1');
            outputLines.push(line);
            continue;
        }
        // Check for list items
        var listItemMatch = void 0;
        var isListItem = false;
        var bullet = '';
        var content = '';
        var listType = '';
        if ((listItemMatch = line.match(/^- \[ \] (.*)/))) {
            // Unchecked task
            bullet = '🟩 ';
            content = listItemMatch[1];
            isListItem = true;
            listType = 'task';
        }
        else if ((listItemMatch = line.match(/^- \[x\] (.*)/))) {
            // Checked task
            bullet = '✅ ';
            content = listItemMatch[1];
            isListItem = true;
            listType = 'task';
        }
        else if ((listItemMatch = line.match(/^\d+\.\s+(.*)/))) {
            // Ordered list item
            bullet = ''; // numbering will be generated
            content = listItemMatch[1];
            isListItem = true;
            listType = 'ordered';
        }
        else if ((listItemMatch = line.match(/^- (.*)/))) {
            // Unordered list item
            bullet = ''; // numbering will be generated
            content = listItemMatch[1];
            isListItem = true;
            listType = 'unordered';
        }
        if (isListItem) {
            // 处理顶级列表项
            if (indentLevel === 0) {
                topLevelCounter++;
                listCounters = [topLevelCounter];
                prevIndentLevel = 0;
            }
            else {
                // 处理子列表项
                // 确保 listCounters 数组长度与当前缩进级别匹配
                while (listCounters.length <= indentLevel) {
                    listCounters.push(0);
                }
                // 如果缩进级别改变，调整计数器
                if (indentLevel !== prevIndentLevel) {
                    // 如果缩进更深，添加新的计数器
                    if (indentLevel > prevIndentLevel) {
                        listCounters[indentLevel] = 0;
                    }
                    else {
                        // 如果缩进更浅，截断数组
                        listCounters = listCounters.slice(0, indentLevel + 1);
                    }
                }
                // 增加当前级别的计数
                listCounters[indentLevel]++;
            }
            // 生成编号
            var numbering = listCounters.slice(0, indentLevel + 1).join('.');
            // Apply formatting to content
            content = applyFormatting(content);
            if (bullet === '🟩 ' || bullet === '✅ ') {
                // For top-level tasks, include bullet before numbering
                numbering = bullet + numbering + '. ' + content;
            }
            else {
                numbering = numbering + '. ' + content;
            }
            // Add to output
            outputLines.push(numbering);
            prevIndentLevel = indentLevel;
            continue;
        }
        else {
            // Not a list item
            // Reset listCounters and prevIndentLevel if necessary
            listCounters = [];
            prevIndentLevel = 0;
            // Apply formatting replacements to the line
            line = applyFormatting(line);
            outputLines.push(line);
        }
    }
    return outputLines.join('\n');
}
function applyFormatting(text) {
    // Define the patterns and their replacements in order
    var patterns = [
        { regex: /\*\*(.*?)\*\*/, replacement: ' *$1* ' }, // bold
        { regex: /(^|[^*])\*(.*?)\*(?!\*)/, replacement: '$1_$2_' }, // italic
        { regex: /~~(.*?)~~/, replacement: ' ~$1~ ' }, // strike
        { regex: /==(.*?)==/, replacement: ' `$1` ' }, // emphasize
        { regex: /`(.*?)`/, replacement: ' {$1} ' }, // quote
    ];
    var result = '';
    var remainingText = text;
    while (remainingText.length > 0) {
        var earliestMatch = null;
        var earliestIndex = remainingText.length;
        // Find the earliest match among the patterns
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var pattern = patterns_1[_i];
            pattern.regex.lastIndex = 0; // Reset regex index
            var match = pattern.regex.exec(remainingText);
            if (match && match.index < earliestIndex) {
                earliestMatch = {
                    pattern: pattern,
                    match: match,
                    index: match.index,
                };
                earliestIndex = match.index;
            }
        }
        if (earliestMatch) {
            // Append text before the match
            result += remainingText.slice(0, earliestMatch.index);
            // Apply the replacement
            var replacedText = earliestMatch.match[0].replace(earliestMatch.pattern.regex, earliestMatch.pattern.replacement);
            result += replacedText;
            // Update remainingText
            remainingText = remainingText.slice(earliestMatch.index + earliestMatch.match[0].length);
        }
        else {
            // No more matches, append the rest of the text
            result += remainingText;
            break;
        }
    }
    return result;
}
