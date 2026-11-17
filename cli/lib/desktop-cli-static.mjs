/**
 * Static CLI loader for esbuild-bundled desktop bridge (production).
 * Do not use dynamic import() — paths do not exist inside the .app bundle.
 */
import * as configMod from './config.js';
import * as authMod from './auth.js';
import * as apiMod from './api.js';
import * as ideMod from './ide.js';
import * as installsMod from './installs.js';
import * as extractMod from './download-and-extract.mjs';
import * as collectionMod from './download-collection.mjs';
import * as updateHelpersMod from './update-helpers.mjs';

export function loadDesktopCliStatic() {
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
