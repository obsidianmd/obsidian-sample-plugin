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
