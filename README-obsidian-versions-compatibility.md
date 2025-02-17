# Obsidian versions compatibility

> | :exclamation: To avoid issues resulting from breaking changes in Obsidian always use the newest version of the plugin|
> |----------------------------------------------|
> | - Obsidian 1.7.2 - update the plugin to 3.1.0 or newer --> More details in a dedicated section below.|
> | - Obsidian 1.6.3 - update the plugin to 2.1.11 or newer --> More details in a dedicated section below.|
> | - Obsidian 1.6.0 - update the plugin to 2.1.9 or newer --> More details in a dedicated section below.|
> | - Obsidian 1.5.4 - update the plugin to 2.1.7 or newer --> More details in a dedicated section below.|

---
> | :exclamation:  Breaking changes in Obsidian 1.7.2 - update the plugin to 3.1.0 or newer|
> |----------------------------------------------|
>
> Obsidian team introduced some more breaking changes in a not-backward-compatible way starting from Obsidian 1.7.2.
>
> The observed issues were minor and related to initial automatic application of custom sorting.
> 1. The custom sort plugin is **unable to automatically apply the custom sort on start**
     >   - when the File Explorer is not visible on app start
>   - for the _Lazy Plugin Loader_ plugin occurs by definition
>   - prevalent on mobile
>
> The release 3.1.0 fixed some of the scenarios by introducing a delay in initial auto-application
> of custom sorting. The delay is by default set to 1 second and can be increased up to 30 seconds,
> which can be needed for large vaults, large number of plugins or on mobile.
>
> At the same time, when the File Explorer is not visible on app start, the custom sorting can't be
> applied automatically by definition: there is no instance of File Explorer. This is an unfortunate
> side effect of the [deferred views](https://docs.obsidian.md/Plugins/Guides/Understanding+deferred+views)
> introduced by Obsidian 1.7.2.
> There is no cure for this scenario and the custom sorting has to be applied manually when the
> File Explorer is eventually displayed. The simplest way is to click the ribbon icon (on desktop)
> or use the command 'sort-on' on mobile.
>
> 2. The custom sort plugin **keeps showing the notifications** with each change to any note
>
> The release 3.1.0 fixed this fully
>
> ---
> For more details of the observed misbehaviors you can go to:
> - [#161: Find out how to automatically apply custom sort on app start / vault (re)load etc.](https://github.com/SebastianMC/obsidian-custom-sort/issues/161)
> - [#162: \[bug\]\[minor\] Obsidian 1.7.2 breaking changes - when File Explorer is not displayed an attempt to apply custom sort fails with error](https://github.com/SebastianMC/obsidian-custom-sort/issues/162)
> - [#163: Obsidian 1.7.2 - automatic sorting fails when launching Obsidian](https://github.com/SebastianMC/obsidian-custom-sort/issues/163)
> - [#165: Obsidian 1.7.3 - Constant Notifications "Custom sorting ON" and "Parsing custom sorting specification SUCCEEDED!"](https://github.com/SebastianMC/obsidian-custom-sort/issues/165)
> - [#169: Not working on mobile](https://github.com/SebastianMC/obsidian-custom-sort/issues/169)
>

---
> | :exclamation:  Breaking changes in Obsidian 1.6.3 causing a minor issue - update the plugin to 2.1.11 or newer|
> |----------------------------------------------|
>
> Obsidian team introduced yet another breaking change in 1.6.3 probably related to plugin's lifecycle or File Explorer module lifecycle.
> In result, due to race condition, the custom sort order is not always applied automatically after app reload or vault reload.
> Manual (re)application is needed via ribbon click of via 'sort on' command.
> The [2.1.11](https://github.com/SebastianMC/obsidian-custom-sort/releases/tag/2.1.11) release of the plugin fixes this inconvenience.
>
> For more details of the observed misbehavior (of not updated plugin) you can go to [#147](https://github.com/SebastianMC/obsidian-custom-sort/issues/147)

---
> | :exclamation:  Breaking changes in Obsidian 1.6.0 (and newer) - update the plugin to 2.1.9 or newer|
> |----------------------------------------------|
>
> Obsidian team introduced some breaking changes in File Explorer sorting code in a not-backward-compatible way starting from Obsidian 1.6.0.
>
> The **custom sort** plugin starting from release **2.1.9** was adjusted to work correctly with these breaking changes in Obsidian 1.6.0 and newer.
> The plugin remains backward compatible, so you can safely update the plugin for Obsidian earlier than 1.6.0
>
> For more details of the observed misbehavior (of not updated plugin) you can go to [#145](https://github.com/SebastianMC/obsidian-custom-sort/issues/145)

---
> | :exclamation:  Breaking changes in Obsidian 1.5.4 (and newer) - update the plugin to 2.1.7 or newer|
> |----------------------------------------------|
>
> Obsidian team introduced some breaking changes in File Explorer in a not-backward-compatible way starting from Obsidian 1.5.4.
>
> The **custom sort** plugin starting from release **2.1.7** was adjusted to work correctly with these breaking changes in Obsidian 1.5.4 and newer.
> The plugin remains backward compatible, so you can safely update the plugin for Obsidian earlier than 1.5.4
>
> For more details of the observed misbehavior (of not updated plugin) you can go to [#131](https://github.com/SebastianMC/obsidian-custom-sort/issues/131) or [#135](https://github.com/SebastianMC/obsidian-custom-sort/issues/135) or [#139](https://github.com/SebastianMC/obsidian-custom-sort/issues/139)
>

