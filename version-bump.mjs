import { readFile as readFile0, writeFile as writeFile0 } from "fs";
import { exec as exec0 } from "child_process";
import { promisify } from "util";

const exec = promisify(exec0),
	readFile = promisify(readFile0),
	writeFile = promisify(writeFile0);

const targetVersion = process.env.npm_package_version;

(async () => {
	// read minAppVersion from manifest.json and bump version to target version
	let menifest = JSON.parse((await readFile("manifest.json")).toString());
	const { minAppVersion } = menifest;
	menifest.version = targetVersion;
	await writeFile("manifest.json", JSON.stringify(menifest, null, 2));

	// update versions.json with target version and minAppVersion from manifest.json
	let versions = JSON.parse((await readFile("versions.json")).toString());
	versions[targetVersion] = minAppVersion;
	await writeFile("versions.json", JSON.stringify(versions, null, 2));

  // save changes in git
	await exec("git add manifest.json versions.json");
})().catch(() => process.exit(1));
