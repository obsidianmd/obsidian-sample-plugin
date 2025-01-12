# 调试技巧

1. 实时日志查看
- 保持开发者工具打开
- 在 Console 面板查看日志
- 使用 console.log() 添加临时调试信息

2. 热重载
- 修改代码后保存
- npm run dev 会自动重新构建
- 在 Obsidian 中禁用并重新启用插件

3. 常见问题排查
- 如果插件没有出现在列表中，检查 manifest.json
- 如果无法启用插件，检查 main.js 是否生成
- 如果同步失败，检查 Notion API 响应

4. 文件位置验证
确保以下文件存在且位置正确：
.obsidian/plugins/obsidian-notion-sync/
├── manifest.json
├── main.js
├── styles.css (如果有)
└── package.json 