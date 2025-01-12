# Notion 配置指南

## 1. 创建 Notion Integration
1. 访问 https://www.notion.so/my-integrations
2. 点击 "New integration"
3. 填写名称（如 "Obsidian Sync"）
4. 选择关联的工作区
5. 提交后获取 Integration Token（以 "secret_" 开头）

## 2. 创建目标数据库
1. 在 Notion 中创建一个新页面
2. 添加一个新的数据库（全页面）
3. 添加以下属性：
   - Name (标题类型，默认存在)
   - Tags (多选类型)
   - LastSync (日期类型)

## 3. 配置数据库权限
1. 打开数据库页面
2. 点击右上角的 "Share" 按钮
3. 在 "Connections" 部分添加你创建的 Integration

## 4. 获取数据库 ID
1. 在浏览器中打开数据库页面
2. URL 中形如 "https://www.notion.so/xxx/yyyyyyy?v=zzz" 的 yyyyyyy 部分就是数据库 ID 