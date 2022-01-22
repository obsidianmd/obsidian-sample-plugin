import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let menifest = JSON.parse(readFileSync("manifest.json").toString());
const { minAppVersion } = menifest;
menifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(menifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync("versions.json").toString());
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
