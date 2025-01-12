# Obsidian Notion 同步插件

一个用于将 Obsidian 笔记同步到 Notion 数据库的插件。

## 功能特点

- 一键同步笔记到 Notion
- 支持多种 Markdown 元素
- 右键菜单集成
- 命令面板支持
- 安全的令牌存储
- 可配置的同步设置

## 设置指南

### 1. 创建 Notion Integration

1. 访问 [Notion Integrations](https://www.notion.so/my-integrations)
2. 点击"New integration"
3. 输入集成名称（如"Obsidian Sync"）
4. 选择数据库所在的工作区
5. 设置权限（至少需要读写内容权限）
6. 保存并复制 Integration Token

### 2. 准备 Notion Database

1. 在 Notion 中创建新数据库（或使用现有数据库）
2. 数据库必须包含"Name"属性（title 类型）
3. 获取 Database ID：
   - 以全页面视图打开数据库
   - URL 格式如：`https://notion.so/workspace/1234...abcd`
   - 复制最后一部分（32个字符）- 这就是 Database ID

### 3. 连接 Database 与 Integration

1. 在 Notion 中打开数据库
2. 点击右上角的"..."
3. 进入"Connections"
4. 找到并添加你的 integration

### 4. 配置插件

1. 打开 Obsidian 设置
2. 进入"第三方插件" → "Notion 同步"
3. 输入 Integration Token
4. 输入 Database ID
5. 根据需要配置其他设置

## 使用方法

### 基本同步

1. 打开要同步的笔记
2. 使用以下方法之一：
   - 在文件菜单中点击"同步到 Notion"（右键）
   - 使用命令面板（Ctrl/Cmd + P）搜索"同步到 Notion"

### 支持的元素

- 标题（H1-H3）
- 段落
- 无序列表（支持多级）
- 有序列表
- 基本文本格式

### 多级列表处理

插件支持三种方式处理多级列表：

1. **保持原有层级**（默认）
   ```markdown
   - 一级项目
     - 二级项目
       - 三级项目
   ```
   同步到 Notion 后保持原有的层级结构：
   ```
   ? 一级项目
     ? 二级项目
       ? 三级项目
   ```

2. **转为平级结构**
   ```markdown
   - 一级项目
     - 二级项目
       - 三级项目
   ```
   同步到 Notion 后转换为：
   ```
   ? 一级项目
   ? 二级项目
   ? 三级项目
   ```

3. **忽略子级内容**
   ```markdown
   - 一级项目
     - 二级项目（会被忽略）
       - 三级项目（会被忽略）
   - 另一个一级项目
   ```
   同步到 Notion 后只保留顶级项目：
   ```
   ? 一级项目
   ? 另一个一级项目
   ```

选择合适的处理方式：
- 如果你的 Notion 数据库需要保持文档的完整层级结构，选择"保持原有层级"
- 如果你希望简化列表结构便于在 Notion 中查看，选择"转为平级结构"
- 如果你只关注顶层信息，选择"忽略子级内容"

### 设置说明

- **Integration Token**：Notion 集成令牌（安全加密存储）
- **Database ID**：目标 Notion 数据库标识符
- **列表处理方式**：控制多级列表的同步行为
  - 保持原有层级：完整保留列表的层级关系
  - 转为平级结构：将多级列表转换为同级项目
  - 忽略子级内容：仅同步顶层列表项

## 故障排除

### 常见问题

1. **认证失败**
   - 验证 Integration Token 是否正确
   - 检查 Token 是否具有适当权限

2. **找不到数据库**
   - 验证 Database ID 是否正确
   - 确保 Integration 已被授权访问数据库

3. **同步失败**
   - 检查网络连接
   - 确认文件大小在限制内（500KB）
   - 确保内容格式受支持

## 安全性

- Integration Token 采用加密存储
- 不向第三方发送数据
- 所有通信直接与 Notion API 进行

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)

## 支持

- [报告问题](https://github.com/e6g2cyvryi/obsidian-notion-sync/issues)
- [功能建议](https://github.com/e6g2cyvryi/obsidian-notion-sync/issues)

## 技术支持

基于 [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api) 和 [Notion API](https://developers.notion.com/) 构建 