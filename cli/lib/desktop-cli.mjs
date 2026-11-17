import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} cliLibRoot absolute path to cli/lib */
export async function loadDesktopCli(cliLibRoot) {
  const importCli = (subpath) =>
    import(pathToFileURL(path.join(cliLibRoot, subpath)).href);

  const [configMod, authMod, apiMod, ideMod, installsMod, extractMod, collectionMod, updateHelpersMod] =
    await Promise.all([
      importCli('config.js'),
      importCli('auth.js'),
      importCli('api.js'),
      importCli('ide.js'),
      importCli('installs.js'),
      importCli('download-and-extract.mjs'),
      importCli('download-collection.mjs'),
      importCli('update-helpers.mjs')
    ]);

  return {
    ...configMod,
    ...authMod,
    ...apiMod,
    ...ideMod,
    ...installsMod,
    downloadAndExtract: extractMod.downloadAndExtract,
    readSkillMdAtVersion: extractMod.readSkillMdAtVersion,
    downloadCollectionZip: collectionMod.downloadCollectionZip,
    extractCollectionZip: collectionMod.extractCollectionZip,
    fetchCollectionDetail: collectionMod.fetchCollectionDetail,
    ...updateHelpersMod
  };
}
