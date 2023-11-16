module.exports = {
    Vault: {},
    Workspace: {},
    Plugin: class {
        addCommand() { }
        addRibbonIcon() { return { addClass: () => { } } }
        addSettingTab() { }
        addStatusBarItem() { return { setText: () => { } } }
        loadData() { }
        registerDomEvent() { }
        registerInterval() { }
    },
    Modal: class { },
    PluginSettingTab: class { },
    TFolder: class { },
    App: class { }
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSDOM = require("jsdom").JSDOM
const dom = new JSDOM()
global.document = dom.window.document
global.window = dom.window
