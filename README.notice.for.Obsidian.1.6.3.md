> | :exclamation:  Breaking changes in Obsidian 1.6.3 causing a minor issue - update the plugin to 2.1.11 or newer|
> |----------------------------------------------|
>
> Obsidian team introduced yet another breaking change in 1.6.3 probably related to plugin's lifecycle or File Explorer module lifecycle.
> In result, due to race condition, the custom sort order is not always applied automatically after app reload or vault reload.
> Manual (re)application is needed via ribbon click of via 'sort on' command.
> The [2.1.11](https://github.com/SebastianMC/obsidian-custom-sort/releases/tag/2.1.11) release of the plugin fixes this inconvenience.
> 
> For more details of the observed misbehavior (of not updated plugin) you can go to [#147](https://github.com/SebastianMC/obsidian-custom-sort/issues/147)

