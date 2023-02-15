#!/bin/bash
if [[ -z "$OB_VERSION" ]] ;  then
  # PUll the latest version of Obsidian if its not specified.
  JSON=$(curl -Ss https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/desktop-releases.json)
  OB_VERSION=$(echo $JSON | jq -r '.latestVersion')
fi

sudo apt-get update -y
sudo apt-get install fuse firefox -y

sudo wget -O /bin/Obsidian https://github.com/obsidianmd/obsidian-releases/releases/download/v$OB_VERSION/Obsidian-$OB_VERSION.AppImage
sudo chmod +x /bin/Obsidian

cp .devcontainer/menu ~/.fluxbox/menu

