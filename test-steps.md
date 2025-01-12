# Obsidian 测试步骤

1. 启动 Obsidian
- 打开测试 vault（H:\Obsidian\helper-test）
- 进入设置 -> 第三方插件
- 关闭安全模式
- 刷新插件列表
- 确认 "Obsidian Notion Sync" 出现在插件列表中
- 启用插件

2. 配置插件
- 打开插件设置
- 填入 Notion Token
- 填入数据库 ID
- 选择深层列表处理方式（建议先选择 "convert"）

3. 功能测试
- 打开 test-cases/basic.md
- 使用命令面板（Ctrl+P）
- 输入 "同步到 Notion"
- 观察同步结果和提示信息

4. 错误测试
- 尝试同步空文档
- 尝试使用错误的 Token
- 尝试使用错误的数据库 ID

5. 日志检查
- 打开开发者工具（Ctrl+Shift+I）
- 检查 Console 面板中的错误信息 