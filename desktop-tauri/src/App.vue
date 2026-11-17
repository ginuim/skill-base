<script setup>
import { ref, computed, inject, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from './i18n/index.js';
import { useTheme } from './composables/useTheme.js';
import SkillDetail from './components/SkillDetail.vue';
import VersionSelect from './components/VersionSelect.vue';

const { t, locale, setLocale } = useI18n();
const { preference: themePreference, setPreference: setThemePreference } = useTheme();
/** Tauri 等客户端通过 provide 注入应用图标 URL；未注入时回退为闪电图标 */
const appLogoSrc = inject('appLogoSrc', null);

const currentTab = ref('installed');
const searchQuery = ref('');
const marketQuery = ref('');
const collectionQuery = ref('');
const selectedSkillId = ref('');
const agentFilter = ref('');
const workspaceSearch = ref(null);
const marketOnlyFavorites = ref(false);
const marketSelectedTagIds = ref([]);
const showMarketTagDropdown = ref(false);
const marketTagDropdownRef = ref(null);

const config = ref({ baseUrl: '', profile: '', profiles: [], username: null, hasToken: false, projectRoot: '' });
const profileOptions = computed(() => {
  const options = config.value.profiles;
  if (!config.value.profile || options.some((item) => item.name === config.value.profile)) return options;
  return [{ name: config.value.profile, baseUrl: config.value.baseUrl }, ...options];
});
const activeRegistry = computed(() => ({ profile: config.value.profile, baseUrl: config.value.baseUrl }));
const installedSkills = ref([]);
const marketSkills = ref([]);
const collections = ref([]);
const collectionsLoaded = ref(false);
const selectedCollection = ref(null);
const selectedCollectionSkills = ref([]);
const collectionDetailLoading = ref(false);
const globalTargets = ref([]);
const projectTargets = ref([]);

const toastMessage = ref('');
const pendingLoads = ref({ installed: false, market: false, collections: false });
const loading = computed(() => pendingLoads.value[currentTab.value]);
const loadRequests = { installed: 0, market: 0, collections: 0 };
let collectionRequest = 0;

function errMessage(e) {
  if (e == null) return 'unknown';
  if (typeof e === 'string') return e;
  const direct = e.message || e.detail || e.error || e.data?.message || e.data?.detail;
  if (direct) return String(direct);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// Settings modal
const settingsModalOpen = ref(false);
const settingsTab = ref('general');
const registryUrl = ref('');
const verificationCode = ref('');
const patReady = ref(false);
const profileBusy = ref(false);
const newProfileOpen = ref(false);
const newProfileName = ref('');
const newProfileUrl = ref('');
const batchUpdating = ref(false);
const settingsBusy = computed(() => profileBusy.value || isExchangingPat.value || isTestingConnection.value);
const profileControlsDisabled = computed(() => (
  !config.value.profile || config.value.profileLocked || settingsBusy.value ||
  batchUpdating.value || installing.value || updating.value || deleting.value
));
const isExchangingPat = ref(false);
const isTestingConnection = ref(false);

// Install modal
const installModalOpen = ref(false);
const installKind = ref('skill');
const installSkill = ref(null);
const installCollection = ref(null);
const installCollectionSkills = ref([]);
const installVersion = ref('');
const installVersions = ref([]);
const installVersionsLoading = ref(false);
const installTargetTab = ref('global');
const selectedGlobalTargetIds = ref([]);
const selectedProjectTargetIds = ref([]);
const customDirOptions = ref([]);
const selectedCustomDirs = ref([]);
const installProjectRoot = ref('');
const installProjectRootPicked = ref(false);
const installOverwrite = ref(false);
const installMethod = ref('copy');
const installAcceptNested = ref(false);
const installNestedWarn = ref(false);
const installing = ref(false);
const agentTargetFilter = ref('');

// Update modal
const updateModalOpen = ref(false);
const updateSkill = ref(null);
const updateVersions = ref([]);
const updateSelectedVersion = ref('');
const updateInstallPaths = ref([]);
const updateSelectedPaths = ref([]);
const updating = ref(false);

// Delete modal
const deleteModalOpen = ref(false);
const deleteSkill = ref(null);
const deleteInstallPaths = ref([]);
const deleteSelectedPaths = ref([]);
const deleting = ref(false);

const PATH_DISPLAY_MAX = 52;
const updatesAvailable = computed(() => filteredInstalled.value.filter(hasVisibleUpdate).length);

const currentTabLabel = computed(() => {
  if (currentTab.value === 'installed') return t('tabs.installed');
  if (currentTab.value === 'market') return t('tabs.market');
  if (currentTab.value === 'collections') return t('tabs.collections');
  return currentTab.value;
});

const canOpenUpdateVersionDiff = computed(() => {
  const installed = updateSkill.value?.version;
  const selected = updateSelectedVersion.value;
  return Boolean(
    installed && selected && installed !== selected && updateVersions.value.length >= 2
  );
});

const canConfirmInstall = computed(() => {
  if (installTargetTab.value === 'custom') return selectedCustomDirs.value.length > 0;
  if (installTargetTab.value === 'global') {
    return (
      selectedGlobalTargetIds.value.length > 0 &&
      selectedGlobalTargetIds.value.every((id) =>
        targetIsWritable(globalTargets.value.find((target) => target.id === id))
      )
    );
  }
  if (installTargetTab.value === 'project') {
    return Boolean(
      installProjectRootPicked.value &&
        selectedProjectTargetIds.value.length > 0 &&
        selectedProjectTargetIds.value.every((id) =>
          targetIsWritable(projectTargets.value.find((target) => target.id === id))
        )
    );
  }
  return false;
});

const installTitle = computed(() => {
  if (installKind.value === 'collection') {
    return t('install.collectionTitle', {
      name: installCollection.value?.name || installCollection.value?.slug || ''
    });
  }
  return t('install.title', { name: installSkill.value?.name || installSkill.value?.id });
});

const installSummary = computed(() => {
  if (installKind.value !== 'collection') return '';
  return t('install.collectionSummary', {
    count: installCollectionSkills.value.filter((skill) => skill.latest_version).length
  });
});

const projectAgentStepDisabled = computed(() => !installProjectRootPicked.value);

const allDeletePathsSelected = computed(
  () =>
    deleteInstallPaths.value.length > 0 &&
    deleteSelectedPaths.value.length === deleteInstallPaths.value.length
);

const canConfirmDelete = computed(
  () => deleteSelectedPaths.value.length > 0 && !deleting.value
);

const canConfirmUpdate = computed(() => {
  if (updating.value || !updateSkill.value || !updateSelectedVersion.value) return false;
  return updateSelectedPaths.value.length > 0;
});

function toggleSelection(list, id) {
  const idx = list.indexOf(id);
  if (idx === -1) list.push(id);
  else list.splice(idx, 1);
}

function targetIsWritable(target) {
  return Boolean(target) && target.writable !== false;
}

function showTargetWriteError(target) {
  showToast(target?.writeError || t('install.dirNotWritableDetail'));
}

function toggleGlobalTarget(id) {
  const target = globalTargets.value.find((item) => item.id === id);
  if (!targetIsWritable(target)) {
    showTargetWriteError(target);
    return;
  }
  toggleSelection(selectedGlobalTargetIds.value, id);
}

function toggleProjectTarget(id) {
  if (projectAgentStepDisabled.value) return;
  const target = projectTargets.value.find((item) => item.id === id);
  if (!targetIsWritable(target)) {
    showTargetWriteError(target);
    return;
  }
  toggleSelection(selectedProjectTargetIds.value, id);
}

function toggleCustomDir(dir) {
  toggleSelection(selectedCustomDirs.value, dir);
}

function buildInstallTargetsPayload() {
  if (installTargetTab.value === 'custom') {
    return selectedCustomDirs.value.map((customDir) => ({ customDir }));
  }
  if (installTargetTab.value === 'global') {
    return selectedGlobalTargetIds.value.map((targetId) => ({ targetId }));
  }
  return selectedProjectTargetIds.value.map((targetId) => ({ targetId }));
}

function showToast(msg) {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = '';
  }, 3500);
}

function normalizePath(p) {
  if (!p) return '';
  return p.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
}

/** Display path with ~ prefix; ellipsis in the middle when too long */
function formatPath(p, maxLen = PATH_DISPLAY_MAX) {
  const display = normalizePath(p);
  if (display.length <= maxLen) return display;
  const edge = Math.floor((maxLen - 1) / 2);
  return `${display.slice(0, edge)}…${display.slice(-edge)}`;
}

/** Pick version_a (older) and version_b (newer) for the diff page */
function diffVersionPair(installedVer, selectedVer, versionsList) {
  const idxInstalled = versionsList.findIndex((v) => v.version === installedVer);
  const idxSelected = versionsList.findIndex((v) => v.version === selectedVer);
  if (idxInstalled === -1 || idxSelected === -1) {
    return { version_a: installedVer, version_b: selectedVer };
  }
  return idxInstalled > idxSelected
    ? { version_a: installedVer, version_b: selectedVer }
    : { version_a: selectedVer, version_b: installedVer };
}

async function openUpdateVersionOnline(page = 'detail') {
  const skill = updateSkill.value;
  if (!skill?.skillId || !updateSelectedVersion.value) return;
  if (!config.value.baseUrl) {
    promptConfigureServer();
    return;
  }
  try {
    const payload = { skillId: skill.skillId };
    if (page === 'diff' && canOpenUpdateVersionDiff.value) {
      const pair = diffVersionPair(
        skill.version,
        updateSelectedVersion.value,
        updateVersions.value
      );
      payload.page = 'diff';
      payload.version_a = pair.version_a;
      payload.version_b = pair.version_b;
    } else {
      payload.version = updateSelectedVersion.value;
    }
    await window.skb.invoke('skills:openWebPage', payload);
  } catch (e) {
    showToast(t('toast.openFailed', { message: errMessage(e) }));
  }
}

async function revealInstallPath(installPath) {
  try {
    await window.skb.invoke('shell:revealPath', installPath);
  } catch (e) {
    showToast(t('toast.revealFailed', { message: errMessage(e) }));
  }
}

function isInstalled(skillId) {
  return installedSkills.value.some((skill) => skill.skillId === skillId && skill.registryInstalls?.length);
}

function readInstalled(payload) {
  return window.skb.invoke('skills:readInstalled', payload);
}

async function loadGlobalTargets() {
  globalTargets.value = await window.skb.invoke('config:getGlobalTargets');
}

async function loadProjectTargetTemplates() {
  projectTargets.value = await window.skb.invoke('config:getProjectTargetTemplates');
}

async function loadProjectTargets() {
  if (!installProjectRoot.value) {
    await loadProjectTargetTemplates();
    return;
  }
  projectTargets.value = await window.skb.invoke(
    'config:getProjectTargets',
    installProjectRoot.value
  );
}

async function loadConfig() {
  try {
    config.value = await window.skb.invoke('config:get');
    registryUrl.value = config.value.baseUrl || '';
    patReady.value = config.value.hasToken;
    installProjectRoot.value = config.value.projectRoot || '';
    await loadGlobalTargets();
  } catch (e) {
    showToast(e?.message || String(e));
  }
}

async function loadItems(tab, target, fetchItems) {
  const request = ++loadRequests[tab];
  pendingLoads.value[tab] = true;
  try {
    const items = await fetchItems();
    if (request === loadRequests[tab]) target.value = items;
  } catch (e) {
    if (request === loadRequests[tab]) {
      showToast(t('toast.loadFailed', { message: errMessage(e) }));
    }
  } finally {
    if (request === loadRequests[tab]) pendingLoads.value[tab] = false;
  }
  return request === loadRequests[tab];
}

const loadInstalled = () => loadItems('installed', installedSkills, () => window.skb.invoke('skills:getInstalled'));
const loadMarket = () => loadItems('market', marketSkills, () => window.skb.invoke('skills:search', ''));

async function loadCollections() {
  if (await loadItems('collections', collections, () => window.skb.invoke('collections:list'))) collectionsLoaded.value = true;
}

const filteredCollections = computed(() => {
  const q = collectionQuery.value.trim().toLowerCase();
  if (!q) return collections.value;
  return collections.value.filter(
    (collection) =>
      collection.name?.toLowerCase().includes(q) ||
      collection.slug?.toLowerCase().includes(q) ||
      collection.description?.toLowerCase().includes(q)
  );
});

async function openCollection(collection) {
  const request = ++collectionRequest;
  selectedCollection.value = collection;
  selectedCollectionSkills.value = [];
  collectionDetailLoading.value = true;
  try {
    const ref = collection.slug || collection.id;
    const detail = await window.skb.invoke('collections:get', ref);
    if (request !== collectionRequest) return;
    selectedCollection.value = detail.collection || collection;
    selectedCollectionSkills.value = detail.skills || [];
  } catch (e) {
    showToast(t('toast.loadFailed', { message: errMessage(e) }));
  } finally {
    if (request === collectionRequest) collectionDetailLoading.value = false;
  }
}

function closeCollectionDetail() {
  collectionRequest++;
  collectionDetailLoading.value = false;
  selectedCollection.value = null;
  selectedCollectionSkills.value = [];
}

const marketAvailableTags = computed(() => {
  const map = new Map();
  for (const skill of marketSkills.value) {
    for (const tag of skill.tags || []) {
      if (!map.has(tag.id)) map.set(tag.id, tag);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
});

const filteredMarketSkills = computed(() => {
  let result = marketSkills.value;

  if (marketOnlyFavorites.value) {
    result = result.filter((skill) => skill.is_favorited);
  }

  const tagIds = marketSelectedTagIds.value;
  if (tagIds.length > 0) {
    const need = new Set(tagIds);
    result = result.filter((skill) => {
      const have = (skill.tags || []).map((t) => t.id);
      return have.some((id) => need.has(id));
    });
  }

  const q = marketQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (skill) =>
        skill.name?.toLowerCase().includes(q) ||
        skill.description?.toLowerCase().includes(q) ||
        skill.id?.toLowerCase().includes(q)
    );
  }

  return result;
});

function isMarketTagSelected(id) {
  return marketSelectedTagIds.value.includes(id);
}

function toggleMarketTag(id) {
  const cur = marketSelectedTagIds.value;
  const i = cur.indexOf(id);
  if (i === -1) marketSelectedTagIds.value = [...cur, id];
  else marketSelectedTagIds.value = cur.filter((x) => x !== id);
}

function clearMarketTagFilter() {
  marketSelectedTagIds.value = [];
}

function toggleMarketTagDropdown() {
  showMarketTagDropdown.value = !showMarketTagDropdown.value;
}

function closeMarketTagDropdown() {
  showMarketTagDropdown.value = false;
}

function onDocumentPointerDown(e) {
  if (!showMarketTagDropdown.value) return;
  const root = marketTagDropdownRef.value;
  if (root?.contains(e.target)) return;
  closeMarketTagDropdown();
}

async function openMarketSkillDetail(skill) {
  if (!skill?.id) return;
  if (!config.value.baseUrl) {
    promptConfigureServer();
    return;
  }
  try {
    await window.skb.invoke('skills:openWebPage', { skillId: skill.id });
  } catch (e) {
    showToast(t('toast.openFailed', { message: errMessage(e) }));
  }
}

async function openCollectionOnline(collection) {
  const ref = collection?.id;
  if (!ref) return;
  if (!config.value.baseUrl) {
    promptConfigureServer();
    return;
  }
  try {
    await window.skb.invoke('skills:openWebPage', { collectionRef: ref });
  } catch (e) {
    showToast(t('toast.openFailed', { message: errMessage(e) }));
  }
}

async function openInstallModal(skill) {
  installKind.value = 'skill';
  installSkill.value = skill;
  installCollection.value = null;
  installCollectionSkills.value = [];
  installVersion.value = '';
  installVersions.value = [];
  installVersionsLoading.value = true;
  installOverwrite.value = false;
  installMethod.value = 'copy';
  installAcceptNested.value = false;
  installNestedWarn.value = false;
  customDirOptions.value = [];
  selectedCustomDirs.value = [];
  installProjectRoot.value = '';
  installProjectRootPicked.value = false;
  installTargetTab.value = 'global';
  agentTargetFilter.value = '';
  selectedGlobalTargetIds.value = [];
  selectedProjectTargetIds.value = [];
  installModalOpen.value = true;
  await loadGlobalTargets();
  await loadProjectTargetTemplates();
  try {
    const skillId = skill.id || skill.skillId;
    installVersions.value = await window.skb.invoke('skills:getVersions', skillId);
    installVersion.value =
      installVersions.value[0]?.version || skill.latest_version || skill.latest || '';
  } catch (e) {
    showToast(t('toast.versionsLoadFailed', { message: errMessage(e) }));
    installModalOpen.value = false;
  } finally {
    installVersionsLoading.value = false;
  }
}

async function openCollectionInstallModal(collection, skills = []) {
  installKind.value = 'collection';
  installSkill.value = null;
  installCollection.value = collection;
  installCollectionSkills.value = skills;
  installVersion.value = '';
  installVersions.value = [];
  installVersionsLoading.value = false;
  installOverwrite.value = false;
  installMethod.value = 'copy';
  installAcceptNested.value = false;
  installNestedWarn.value = false;
  customDirOptions.value = [];
  selectedCustomDirs.value = [];
  installProjectRoot.value = '';
  installProjectRootPicked.value = false;
  installTargetTab.value = 'global';
  agentTargetFilter.value = '';
  selectedGlobalTargetIds.value = [];
  selectedProjectTargetIds.value = [];
  installModalOpen.value = true;
  await loadGlobalTargets();
  await loadProjectTargetTemplates();
}

async function pickCustomInstallDir() {
  const dir = await window.skb.invoke(
    'project:pickInstallDir',
    customDirOptions.value[0] || installProjectRoot.value || config.value.projectRoot
  );
  if (!dir) return;
  if (!customDirOptions.value.includes(dir)) {
    customDirOptions.value.push(dir);
  }
  if (!selectedCustomDirs.value.includes(dir)) {
    selectedCustomDirs.value.push(dir);
  }
  installTargetTab.value = 'custom';
}

async function pickInstallProjectRoot() {
  const dir = await window.skb.invoke(
    'project:pickInstallDir',
    installProjectRoot.value || config.value.projectRoot
  );
  if (!dir) return;
  installProjectRoot.value = dir;
  installProjectRootPicked.value = true;
  config.value.projectRoot = dir;
  selectedProjectTargetIds.value = [];
  await window.skb.invoke('project:setRoot', dir);
  await loadProjectTargets();
  installTargetTab.value = 'project';
}

watch(installTargetTab, async (tab) => {
  if (tab === 'project' && projectTargets.value.length === 0) {
    await loadProjectTargetTemplates();
  }
});

async function confirmInstall() {
  if (!canConfirmInstall.value) return;
  if (installKind.value === 'skill' && (!installSkill.value || !installVersion.value)) return;
  if (installKind.value === 'collection' && !installCollection.value) return;
  installing.value = true;
  try {
    if (installKind.value === 'collection') {
      const collectionRef = installCollection.value.slug || installCollection.value.id;
      const result = await window.skb.invoke('collections:install', {
        ...activeRegistry.value,
        collectionRef,
        targets: buildInstallTargetsPayload(),
        projectRoot: installTargetTab.value === 'project' ? installProjectRoot.value : undefined,
        overwrite: installOverwrite.value,
        method: installMethod.value,
        acceptNested: installAcceptNested.value
      });

      if (!result.ok) {
        if (result.code === 'NESTED_IDE_PATH') {
          installNestedWarn.value = true;
          showToast(result.detail);
          return;
        }
        if (result.code === 'EXISTS') {
          showToast(result.detail);
          return;
        }
        throw new Error(result.detail || t('toast.installFailed', { message: '' }));
      }

      installModalOpen.value = false;
      showToast(t('toast.collectionInstalled', {
        name: installCollection.value.name || collectionRef,
        count: result.installed?.length || 0
      }));
      await loadInstalled();
      return;
    }

    const skillId = installSkill.value.id || installSkill.value.skillId;
    const result = await window.skb.invoke('skills:install', {
      ...activeRegistry.value,
      skillId,
      version: installVersion.value,
      targets: buildInstallTargetsPayload(),
      projectRoot: installTargetTab.value === 'project' ? installProjectRoot.value : undefined,
      overwrite: installOverwrite.value,
      method: installMethod.value,
      acceptNested: installAcceptNested.value
    });

    if (!result.ok) {
      if (result.code === 'NESTED_IDE_PATH') {
        installNestedWarn.value = true;
        showToast(result.detail);
        return;
      }
      if (result.code === 'EXISTS') {
        showToast(result.detail);
        return;
      }
      throw new Error(result.detail || t('toast.installFailed', { message: '' }));
    }

    installModalOpen.value = false;
    const count = result.installed?.length || 0;
    showToast(t('toast.installedTo', { skillId, count }));
    await loadInstalled();
  } catch (e) {
    showToast(t('toast.installFailed', { message: errMessage(e) }));
  } finally {
    installing.value = false;
  }
}

async function openUpdateModal(skill) {
  const registry = activeRegistry.value;
  const paths = skill.registryInstalls;
  updateSkill.value = { ...skill, version: paths[0]?.version || '' };
  updateInstallPaths.value = [];
  updateSelectedPaths.value = [];
  updateVersions.value = [];
  updateSelectedVersion.value = '';
  updateModalOpen.value = true;
  try {
    const versions = await window.skb.invoke('skills:getVersions', skill.skillId);
    if (!updateModalOpen.value || activeRegistry.value !== registry || updateSkill.value.skillId !== skill.skillId) return;
    updateVersions.value = versions;
    updateSelectedVersion.value = versions[0]?.version || skill.latest;
    updateInstallPaths.value = paths;
    updateSelectedPaths.value = paths.map((item) => item.installPath);
  } catch (e) {
    showToast(t('toast.versionsLoadFailed', { message: errMessage(e) }));
    updateModalOpen.value = false;
  }
}

async function confirmUpdate() {
  if (!canConfirmUpdate.value) return;
  updating.value = true;
  try {
    const result = await window.skb.invoke('skills:update', {
      skillId: updateSkill.value.skillId,
      version: updateSelectedVersion.value,
      ...activeRegistry.value,
      installPaths: updateSelectedPaths.value
    });

    if (!result.ok && result.code === 'PICK_PATHS') {
      updateInstallPaths.value = result.installs;
      showToast(result.detail);
      return;
    }

    if (!result.ok) throw new Error(result.detail);
    updateModalOpen.value = false;
    showToast(t('toast.updated', { skillId: updateSkill.value.skillId }));
    await loadInstalled();
  } catch (e) {
    showToast(t('toast.updateFailed', { message: errMessage(e) }));
  } finally {
    updating.value = false;
  }
}

function openDeleteModal(skill) {
  deleteSkill.value = skill;
  deleteInstallPaths.value = skill.installs || [];
  deleteSelectedPaths.value = deleteInstallPaths.value.map((item) => item.installPath);
  deleteModalOpen.value = true;
}

function toggleDeletePath(p) {
  const idx = deleteSelectedPaths.value.indexOf(p);
  if (idx === -1) deleteSelectedPaths.value.push(p);
  else deleteSelectedPaths.value.splice(idx, 1);
}

function toggleDeleteAllPaths() {
  deleteSelectedPaths.value = allDeletePathsSelected.value
    ? []
    : deleteInstallPaths.value.map((item) => item.installPath);
}

async function confirmDelete() {
  if (!deleteSkill.value || !canConfirmDelete.value) return;
  deleting.value = true;
  try {
    const result = await window.skb.invoke('skills:delete', {
      skillId: deleteSkill.value.skillId,
      installPaths: deleteSelectedPaths.value
    });

    if (!result.ok) {
      throw new Error(result.detail || t('toast.deleteFailed', { message: '' }));
    }

    const deletedCount = result.deleted?.length || 0;
    const skippedCount = result.skipped?.length || 0;
    deleteModalOpen.value = false;
    if (skippedCount > 0) {
      showToast(t('toast.deletedWithSkipped', { count: deletedCount, skipped: skippedCount }));
    } else {
      showToast(t('toast.deleted', { count: deletedCount }));
    }
    await loadInstalled();
  } catch (e) {
    showToast(t('toast.deleteFailed', { message: errMessage(e) }));
  } finally {
    deleting.value = false;
  }
}

async function updateAll() {
  batchUpdating.value = true;
  const registry = activeRegistry.value;
  const agent = agentFilter.value;
  try {
    for (const skill of filteredInstalled.value.filter(hasVisibleUpdate)) {
      const result = await window.skb.invoke('skills:update', {
        ...registry,
        skillId: skill.skillId,
        version: skill.latest,
        installPaths: skill.registryInstalls
          .filter((item) => item.version !== skill.latest && (!agent || normalizeAgentId(item.ide) === agent))
          .map((item) => item.installPath)
      });
      if (!result.ok) throw new Error(result.detail);
    }
    showToast(t('workspace.syncComplete'));
  } catch (e) {
    showToast(t('toast.updateFailed', { message: errMessage(e) }));
  } finally {
    await loadInstalled();
    batchUpdating.value = false;
  }
}

async function refreshRegistry() {
  for (const tab of Object.keys(loadRequests)) {
    loadRequests[tab]++;
    pendingLoads.value[tab] = false;
  }
  installedSkills.value = installedSkills.value.map((skill) => ({
    ...skill,
    hasUpdate: false,
    remoteAvailable: false,
    registryInstalls: []
  }));
  marketSkills.value = [];
  collections.value = [];
  collectionsLoaded.value = false;
  selectedSkillId.value = '';
  marketSelectedTagIds.value = [];
  closeMarketTagDropdown();
  closeCollectionDetail();
  await loadConfig();
  loadInstalled();
  if (currentTab.value === 'market') loadMarket();
  if (currentTab.value === 'collections') loadCollections();
}

async function changeRegistry(save, success) {
  if (profileControlsDisabled.value) return;
  profileBusy.value = true;
  try {
    await save();
    verificationCode.value = '';
    newProfileOpen.value = false;
    newProfileName.value = '';
    newProfileUrl.value = '';
    await refreshRegistry();
    showToast(t(success));
  } catch (e) {
    showToast(t('toast.saveFailed', { message: errMessage(e) }));
  } finally {
    profileBusy.value = false;
  }
}

function saveServer() {
  return changeRegistry(() => window.skb.invoke('config:setServer', registryUrl.value, activeRegistry.value), 'toast.serverSaved');
}

function switchProfile(event) {
  const { value } = event.target;
  event.target.value = config.value.profile;
  if (value === config.value.profile) return;
  return changeRegistry(() => window.skb.invoke('config:setProfile', { name: value }), 'workspace.profileSwitched');
}

function createProfile() {
  return changeRegistry(() => window.skb.invoke('config:setProfile', {
    name: newProfileName.value,
    baseUrl: newProfileUrl.value
  }), 'workspace.profileCreated');
}

async function exchangePat() {
  if (!verificationCode.value) {
    showToast(t('toast.enterCode'));
    return;
  }
  isExchangingPat.value = true;
  try {
    const result = await window.skb.invoke('auth:exchangePat', verificationCode.value, activeRegistry.value);
    patReady.value = true;
    verificationCode.value = '';
    await refreshRegistry();
    showToast(t('toast.loginSuccess', { username: result.username }));
  } catch (e) {
    showToast(t('toast.verifyFailed', { message: errMessage(e) }));
  } finally {
    isExchangingPat.value = false;
  }
}

async function testConnection() {
  isTestingConnection.value = true;
  try {
    const result = await window.skb.invoke('auth:whoami');
    if (result.ok) {
      showToast(t('toast.connectionOk', { username: result.user.username }));
    } else if (result.reason === 'no_token') {
      showToast(t('toast.notLoggedIn'));
      await window.skb.invoke('skills:search', 'a').catch(() => {
        throw new Error('server unreachable');
      });
      showToast(t('toast.connectionOkNoLogin'));
    } else {
      throw new Error(result.detail || 'auth failed');
    }
  } catch (e) {
    showToast(t('toast.connectionFailed', { message: errMessage(e) }));
  } finally {
    isTestingConnection.value = false;
  }
}

async function openLoginPage() {
  try {
    await window.skb.invoke('auth:openLogin');
  } catch (e) {
    showToast(t('toast.openFailed', { message: errMessage(e) }));
  }
}

async function logout() {
  isExchangingPat.value = true;
  try {
    await window.skb.invoke('auth:logout', activeRegistry.value);
    patReady.value = false;
    await refreshRegistry();
    showToast(t('toast.loggedOut'));
  } catch (e) {
    showToast(t('toast.logoutFailed', { message: errMessage(e) }));
  } finally {
    isExchangingPat.value = false;
  }
}

function openSettingsModal(tab = 'general') {
  settingsTab.value = tab;
  settingsModalOpen.value = true;
  nextTick(() => document.querySelector('.settings-modal .modal-header button')?.focus());
}

function promptConfigureServer() {
  showToast(t('toast.configureServerFirst'));
  openSettingsModal('connection');
}

function onLocaleChange(event) {
  setLocale(event.target.value);
}

function onThemeChange(event) {
  setThemePreference(event.target.value);
}

function toggleUpdatePath(p) {
  const idx = updateSelectedPaths.value.indexOf(p);
  if (idx === -1) updateSelectedPaths.value.push(p);
  else updateSelectedPaths.value.splice(idx, 1);
}

const agentAbbreviations = {
  'claude-code': 'CC',
  cursor: 'CU',
  codex: 'CX',
  qoder: 'QD',
  opencode: 'OC',
  openclaw: 'CL',
  trae: 'TR',
  universal: 'UA',
  copilot: 'GH'
};

function normalizeAgentId(id) {
  return (id || '').replaceAll('_', '-');
}

const agentNames = computed(() => new Map(
  (config.value.agents || []).map(({ id, name }) => [normalizeAgentId(id), name])
));

const installedAgents = computed(() => new Map(installedSkills.value.map((skill) => {
  const ids = new Set(skill.installs.map((item) => normalizeAgentId(item.ide)).filter(Boolean));
  const agents = [...ids].map((id) => ({
    id,
    name: agentNames.value.get(id) || id,
    short: Object.hasOwn(agentAbbreviations, id) ? agentAbbreviations[id] : id.slice(0, 2).toUpperCase()
  }));
  return [skill.skillId, agents.sort((a, b) => a.name.localeCompare(b.name))];
})));

const agentCounts = computed(() => {
  const counts = new Map();
  for (const agents of installedAgents.value.values()) {
    for (const { id, name } of agents) {
      const count = (counts.get(id)?.count || 0) + 1;
      counts.set(id, { id, name, count });
    }
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
});

const filteredInstalled = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return installedSkills.value.filter((skill) =>
    (!agentFilter.value || installedAgents.value.get(skill.skillId).some((agent) => agent.id === agentFilter.value)) &&
    [skill.skillId, skill.name, skill.description].some((value) => value?.toLowerCase().includes(q))
  );
});

function hasVisibleUpdate(skill) {
  return skill.hasUpdate && skill.registryInstalls.some((item) =>
    item.version !== skill.latest && (!agentFilter.value || normalizeAgentId(item.ide) === agentFilter.value)
  );
}

const visibleSkills = computed(() => currentTab.value === 'installed' ? filteredInstalled.value : filteredMarketSkills.value);
const identifySkill = (skill) => skill.skillId || skill.id;
const selectedSkill = computed(() =>
  visibleSkills.value.find((skill) => identifySkill(skill) === selectedSkillId.value) || visibleSkills.value[0]
);
const workspaceEmpty = computed(() => {
  if (loading.value) return t('installed.loading');
  if (currentTab.value === 'market') {
    return t(marketQuery.value || marketOnlyFavorites.value || marketSelectedTagIds.value.length ? 'market.emptyFiltered' : 'market.empty');
  }
  return t(searchQuery.value || agentFilter.value ? 'workspace.noMatches' : 'installed.empty');
});

function navigate(tab, agent = '') {
  if (currentTab.value !== tab) selectedSkillId.value = '';
  currentTab.value = tab;
  agentFilter.value = agent;
}

function focusWorkspaceSearch(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' &&
      !settingsModalOpen.value && !installModalOpen.value && !updateModalOpen.value &&
      !deleteModalOpen.value && workspaceSearch.value && !selectedCollection.value) {
    event.preventDefault();
    workspaceSearch.value.focus();
  }
}

function matchAgentTarget(target, q) {
  const haystack = [target.name, target.id, target.ide, target.path, target.relPath]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

const filteredGlobalTargets = computed(() => {
  const q = agentTargetFilter.value.trim().toLowerCase();
  if (!q) return globalTargets.value;
  return globalTargets.value.filter((t) => matchAgentTarget(t, q));
});

const filteredProjectTargets = computed(() => {
  const q = agentTargetFilter.value.trim().toLowerCase();
  if (!q) return projectTargets.value;
  return projectTargets.value.filter((t) => matchAgentTarget(t, q));
});

watch(currentTab, (tab) => {
  closeCollectionDetail();
  if (tab === 'installed') loadInstalled();
  if (tab === 'market' && !marketSkills.value.length) loadMarket();
  if (tab === 'collections' && !collectionsLoaded.value) loadCollections();
});

onMounted(async () => {
  document.addEventListener('mousedown', onDocumentPointerDown, true);
  document.addEventListener('keydown', focusWorkspaceSearch);
  await loadConfig();
  await loadInstalled();
});

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown, true);
  document.removeEventListener('keydown', focusWorkspaceSearch);
});
</script>

<template>
  <div v-cloak class="app-layout">
    <aside class="sidebar" :inert="settingsModalOpen || installModalOpen || updateModalOpen || deleteModalOpen">
      <div class="sidebar-header">
        <div class="logo-icon" :class="{ 'logo-icon--image': appLogoSrc }">
          <img v-if="appLogoSrc" :src="appLogoSrc" alt="" class="logo-img" />
          <i v-else class="fa-solid fa-bolt" aria-hidden="true"></i>
        </div>
        <span class="brand-name">Skill Base</span>
      </div>

      <nav class="sidebar-nav" :aria-label="t('workspace.library')">
        <p class="nav-heading">{{ t('workspace.library') }}</p>
        <button type="button" class="nav-btn" :aria-current="currentTab === 'installed' && !agentFilter ? 'page' : undefined" @click="navigate('installed')">
          <i class="fa-solid fa-box-archive" aria-hidden="true"></i>
          <span>{{ t('tabs.installed') }}</span>
        </button>
        <button type="button" class="nav-btn" :aria-current="currentTab === 'market' ? 'page' : undefined" @click="navigate('market')">
          <i class="fa-solid fa-globe" aria-hidden="true"></i>
          <span>{{ t('tabs.market') }}</span>
        </button>
        <button type="button" class="nav-btn" :aria-current="currentTab === 'collections' ? 'page' : undefined" @click="navigate('collections')">
          <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
          <span>{{ t('tabs.collections') }}</span>
        </button>

        <template v-if="agentCounts.length">
          <p class="nav-heading agents-heading">{{ t('workspace.agents') }}</p>
          <button
            v-for="agent in agentCounts"
            :key="agent.id"
            type="button" class="nav-btn agent-nav-btn"
            :aria-current="currentTab === 'installed' && agentFilter === agent.id ? 'page' : undefined"
            @click="navigate('installed', agent.id)"
          >
            <i class="fa-solid fa-terminal" aria-hidden="true"></i>
            <span>{{ agent.name }}</span>
            <small>{{ agent.count }}</small>
          </button>
        </template>
      </nav>

      <div class="sidebar-bottom">
        <label for="active-profile" class="nav-heading">{{ t('workspace.source') }}</label>
        <select id="active-profile" :value="config.profile" :disabled="profileControlsDisabled" @change="switchProfile">
          <option v-if="!profileOptions.length" value="">{{ t('status.notConfigured') }}</option>
          <option v-for="item in profileOptions" :key="item.name" :value="item.name">{{ item.name }}</option>
        </select>
        <button
          type="button"
          class="source-status"
          :title="[config.baseUrl, config.username].filter(Boolean).join(' · ')"
          :disabled="settingsBusy || batchUpdating"
          @click="openSettingsModal('connection')"
        >
          <span class="status-dot" :class="{ 'status-dot--inactive': !config.hasToken }"></span>
          <span class="source-text">{{ config.baseUrl || t('status.notConfigured') }}</span>
        </button>
        <button type="button" class="nav-btn" :disabled="settingsBusy || batchUpdating" @click="openSettingsModal()">
          <i class="fa-solid fa-sliders" aria-hidden="true"></i>
          <span>{{ t('nav.settings') }}</span>
        </button>
      </div>
    </aside>

    <main class="main-area" :inert="profileBusy || settingsModalOpen || installModalOpen || updateModalOpen || deleteModalOpen" :aria-busy="profileBusy || loading">
      <header class="workspace-header">
        <div class="workspace-title">
          <span>{{ agentFilter ? agentCounts.find((agent) => agent.id === agentFilter)?.name || agentFilter : currentTabLabel }}</span>
          <span v-if="!selectedCollection" class="workspace-count">{{ currentTab === 'collections' ? filteredCollections.length : visibleSkills.length }}</span>
        </div>
        <div class="workspace-actions">
          <button
            v-if="currentTab === 'installed' && updatesAvailable"
            type="button"
            class="btn-ghost"
            :disabled="batchUpdating || loading"
            @click="updateAll"
          >
            <i class="fa-solid fa-rotate" :class="{ 'fa-spin': batchUpdating }" aria-hidden="true"></i>
            {{ t('installed.syncAll', { count: updatesAvailable }) }}
          </button>
          <button v-if="currentTab === 'installed'" type="button" class="btn-ghost" :disabled="loading || batchUpdating" @click="loadInstalled">
            <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
            {{ t('workspace.refresh') }}
          </button>
          <button v-if="currentTab === 'collections' && !selectedCollection" type="button" class="btn-ghost" :disabled="loading" @click="loadCollections">
            <i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>
            {{ t('workspace.refresh') }}
          </button>
        </div>
      </header>

      <div
        v-if="!selectedCollection"
        class="content-toolbar"
        :class="{ 'content-toolbar--market': currentTab === 'market' }"
      >
        <div class="toolbar-row">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              v-if="currentTab === 'installed'"
              v-model="searchQuery"
              ref="workspaceSearch"
              type="search"
              :placeholder="t('search.installed')"
              :aria-label="t('search.installed')"
            />
            <input
              v-else-if="currentTab === 'market'"
              v-model="marketQuery"
              ref="workspaceSearch"
              type="search"
              :placeholder="t('search.market')"
              :aria-label="t('search.market')"
            />
            <input
              v-else
              v-model="collectionQuery"
              ref="workspaceSearch"
              type="search"
              :placeholder="t('search.collections')"
              :aria-label="t('search.collections')"
            />
            <button
              v-if="currentTab === 'market' && marketQuery"
              type="button"
              class="search-clear-btn"
              :title="t('search.clear')"
              @click="marketQuery = ''"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
            <button
              v-if="currentTab === 'collections' && collectionQuery"
              type="button"
              class="search-clear-btn"
              :title="t('search.clear')"
              @click="collectionQuery = ''"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div v-if="currentTab === 'market'" class="market-filter-actions">
          <button
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip--active': marketOnlyFavorites }"
            @click="marketOnlyFavorites = !marketOnlyFavorites"
          >
            <i class="fa-solid fa-heart"></i>
            {{ t('market.favoritesOnly') }}
          </button>

          <div
            v-if="marketAvailableTags.length > 0"
            ref="marketTagDropdownRef"
            class="tag-filter-dropdown"
            :class="{ 'tag-filter-dropdown--open': showMarketTagDropdown }"
          >
            <button
              type="button"
              class="filter-chip tag-filter-trigger"
              :class="{ 'filter-chip--active': marketSelectedTagIds.length > 0 }"
              @click="toggleMarketTagDropdown"
            >
              <i class="fa-solid fa-tags"></i>
              {{ t('market.tags') }}
              <span v-if="marketSelectedTagIds.length > 0" class="tag-filter-badge">
                {{ marketSelectedTagIds.length }}
              </span>
              <i class="fa-solid fa-chevron-down tag-filter-chevron"></i>
            </button>
            <div
              v-show="showMarketTagDropdown"
              class="tag-filter-panel"
            >
              <div class="tag-filter-panel-header">
                <p class="tag-filter-hint">{{ t('market.tagHint') }}</p>
                <button
                  v-if="marketSelectedTagIds.length > 0"
                  type="button"
                  class="tag-filter-clear"
                  @click="clearMarketTagFilter"
                >
                  <i class="fa-solid fa-xmark"></i>
                  {{ t('market.clear') }}
                </button>
              </div>
              <div class="tag-filter-options">
                <button
                  v-for="tag in marketAvailableTags"
                  :key="tag.id"
                  type="button"
                  class="tag-filter-option"
                  :class="{ 'tag-filter-option--active': isMarketTagSelected(tag.id) }"
                  @click="toggleMarketTag(tag.id)"
                >
                  <span class="tag-filter-option-check">
                    <i v-if="isMarketTagSelected(tag.id)" class="fa-solid fa-check"></i>
                  </span>
                  <span class="tag-filter-option-label">{{ tag.name }}</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="btn-ghost toolbar-refresh-btn"
            :disabled="loading"
            :title="t('market.refresh')"
            @click="loadMarket"
          >
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': loading }"></i>
          </button>
          </div>
        </div>
      </div>

      <div v-if="currentTab !== 'collections'" class="skill-workspace" :inert="batchUpdating">
        <section v-if="visibleSkills.length" class="skill-results" :aria-label="currentTabLabel">
          <ul>
            <li v-for="skill in visibleSkills" :key="identifySkill(skill)">
              <button
                type="button"
                class="result-button"
                :class="{ 'result-button--local': currentTab === 'installed' }"
                :aria-pressed="selectedSkill === skill"
                @click="selectedSkillId = identifySkill(skill)"
              >
                <span v-if="currentTab === 'market'" class="result-icon" aria-hidden="true">
                  <i class="fa-solid fa-cube"></i>
                </span>
                <span class="result-copy">
                  <span class="result-title">
                    <strong :title="skill.name || identifySkill(skill)">{{ skill.name || identifySkill(skill) }}</strong>
                    <span v-if="currentTab === 'installed' && skill.hasUpdate" class="result-update" role="img" :title="t('installed.update')" :aria-label="t('installed.update')"></span>
                  </span>
                  <small v-if="currentTab === 'market'">{{ skill.description || identifySkill(skill) }}</small>
                </span>
                <span v-if="currentTab === 'installed' && installedAgents.get(skill.skillId)?.length" class="result-agents">
                  <span
                    v-for="agent in installedAgents.get(skill.skillId)"
                    :key="agent.id"
                    class="result-agent"
                    :data-agent="agent.id"
                    :title="agent.name"
                    role="img"
                    :aria-label="agent.name"
                  >{{ agent.short }}</span>
                </span>
              </button>
            </li>
          </ul>
        </section>
        <SkillDetail
          v-if="selectedSkill"
          :key="currentTab + ':' + identifySkill(selectedSkill)"
          :skill="selectedSkill"
          :profile="config.profile"
          :home-dir="config.homeDir"
          :local="currentTab === 'installed'"
          :installed="isInstalled(identifySkill(selectedSkill))"
          :read-installed="readInstalled"
          @install="openInstallModal"
          @versions="openUpdateModal"
          @delete="openDeleteModal"
          @reveal="revealInstallPath"
          @online="openMarketSkillDetail"
        />
        <div v-else class="workspace-empty">
          <i class="fa-solid fa-cube" aria-hidden="true"></i>
          <p>{{ workspaceEmpty }}</p>
          <button v-if="currentTab === 'installed' && !loading && !installedSkills.length" type="button" class="btn-ghost" @click="navigate('market')">
            {{ t('tabs.market') }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div v-else class="content-area">
      <template v-if="selectedCollection">
        <div class="collection-detail-header">
          <button type="button" class="btn-ghost" @click="closeCollectionDetail">
            <i class="fa-solid fa-chevron-left"></i>
            {{ t('collections.back') }}
          </button>
          <div class="collection-detail-actions">
            <button
              type="button"
              class="btn-ghost"
              @click="openCollectionOnline(selectedCollection)"
            >
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
              {{ t('collections.openOnline') }}
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="collectionDetailLoading || !selectedCollectionSkills.length"
              @click="openCollectionInstallModal(selectedCollection, selectedCollectionSkills)"
            >
              <i class="fa-solid fa-download"></i>
              {{ t('collections.install') }}
            </button>
          </div>
        </div>

        <div class="collection-hero glass-panel">
          <div class="collection-cover">
            <span class="collection-cover-kicker">COLLECTION</span>
            <strong>{{ selectedCollection.name }}</strong>
            <span>{{ selectedCollection.slug }}</span>
          </div>
          <div class="collection-hero-main">
            <h2>{{ selectedCollection.name }}</h2>
            <p>{{ selectedCollection.description || t('collections.noDesc') }}</p>
            <div class="collection-meta">
              <span>
                <i class="fa-solid fa-cubes"></i>
                {{ t('collections.skillCount', { count: selectedCollectionSkills.length }) }}
              </span>
              <span>
                <i class="fa-solid fa-download"></i>
                {{ selectedCollection.download_count ?? 0 }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="collectionDetailLoading" class="empty-state">
          <i class="fa-solid fa-circle-notch fa-spin"></i> {{ t('collections.loading') }}
        </div>
        <div v-else-if="!selectedCollectionSkills.length" class="empty-state">
          {{ t('collections.emptySkills') }}
        </div>
        <div v-else class="collection-skill-list">
          <div
            v-for="(skill, index) in selectedCollectionSkills"
            :key="skill.id"
            class="collection-skill-row glass-panel"
          >
            <span class="skill-list-index">{{ index + 1 }}</span>
            <div class="skill-list-main">
              <div class="skill-list-title-row">
                <h3>{{ skill.name }}</h3>
                <span class="version-tag">v{{ skill.latest_version || '-' }}</span>
              </div>
              <p>{{ skill.description || skill.id }}</p>
            </div>
            <button
              type="button"
              class="btn-icon market-detail-btn"
              :title="t('market.openDetail')"
              @click="openMarketSkillDetail(skill)"
            >
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="loading && !collections.length" class="empty-state">
          <i class="fa-solid fa-circle-notch fa-spin"></i> {{ t('collections.loading') }}
        </div>
        <div v-else-if="!filteredCollections.length" class="empty-state">
          {{ collectionQuery ? t('collections.emptyFiltered') : t('collections.empty') }}
        </div>
        <div v-else class="collection-grid">
          <button
            v-for="collection in filteredCollections"
            :key="collection.id"
            type="button"
            class="collection-card glass-panel"
            @click="openCollection(collection)"
          >
            <div class="collection-cover collection-cover--small">
              <span class="collection-cover-kicker">COLLECTION</span>
              <strong>{{ collection.name }}</strong>
              <span>{{ collection.slug }}</span>
            </div>
            <div class="collection-card-body">
              <h3>{{ collection.name }}</h3>
              <p>{{ collection.description || t('collections.noDesc') }}</p>
              <div class="collection-meta">
                <span>
                  <i class="fa-solid fa-cubes"></i>
                  {{ collection.skill_count ?? 0 }}
                </span>
                <span>
                  <i class="fa-solid fa-download"></i>
                  {{ collection.download_count ?? 0 }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </template>
      </div>
    </main>

    <!-- Toast (above modal overlays) -->
    <Transition name="fade">
      <div v-if="toastMessage" class="toast glass-panel" role="status">
        <i class="fa-solid fa-terminal"></i>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Install Modal -->
    <div v-if="installModalOpen" class="modal-overlay" @click.self="installModalOpen = false">
      <div class="modal-panel glass-panel">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-download text-indigo"></i>
            {{ installTitle }}
          </h3>
          <button class="btn-icon" @click="installModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <template v-if="installKind === 'skill'">
            <label class="field-label">{{ t('install.version') }}</label>
            <VersionSelect
              v-model="installVersion"
              :versions="installVersions"
              :loading="installVersionsLoading"
              :disabled="installing"
            />
          </template>
          <div v-else class="install-summary">
            <i class="fa-solid fa-layer-group"></i>
            {{ installSummary }}
          </div>

          <fieldset class="install-method" :disabled="installing">
            <legend class="field-label">{{ t('install.method') }}</legend>
            <div class="install-method-options">
              <label class="label-row">
                <input v-model="installMethod" type="radio" name="install-method" value="copy" />
                {{ t('install.methodCopy') }}
              </label>
              <label class="label-row">
                <input v-model="installMethod" type="radio" name="install-method" value="link" />
                {{ t('install.methodLink') }}
              </label>
            </div>
          </fieldset>

          <label class="field-label" style="margin-top: 1rem">{{ t('install.targets') }}</label>

          <nav class="install-target-tabs">
            <button
              type="button"
              :class="{ active: installTargetTab === 'global' }"
              @click="installTargetTab = 'global'"
            >
              <i class="fa-solid fa-globe"></i>
              {{ t('install.global') }}
            </button>
            <button
              type="button"
              :class="{ active: installTargetTab === 'project' }"
              @click="installTargetTab = 'project'"
            >
              <i class="fa-solid fa-robot"></i>
              {{ t('install.project') }}
            </button>
            <button
              type="button"
              :class="{ active: installTargetTab === 'custom' }"
              @click="installTargetTab = 'custom'"
            >
              <i class="fa-solid fa-folder-open"></i>
              {{ t('install.custom') }}
            </button>
          </nav>

          <!-- Tab: global agents -->
          <div v-if="installTargetTab === 'global'" class="install-tab-panel">
            <p class="settings-hint">{{ t('install.globalHint') }}</p>
            <div v-if="selectedGlobalTargetIds.length" class="selection-count">
              {{ t('install.selected', { count: selectedGlobalTargetIds.length }) }}
            </div>
            <div v-if="!globalTargets.length" class="empty-hint">{{ t('install.noGlobalDirs') }}</div>
            <template v-else>
              <div class="target-list-filter search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  v-model="agentTargetFilter"
                  type="search"
                  :placeholder="t('search.agentFilter')"
                  @click.stop
                />
              </div>
              <div v-if="!filteredGlobalTargets.length" class="empty-hint">{{ t('install.noAgentMatch') }}</div>
              <div v-else class="target-list">
              <div
                v-for="target in filteredGlobalTargets"
                :key="target.id"
                :class="[
                  'target-option',
                  {
                    selected: selectedGlobalTargetIds.includes(target.id),
                    'target-exists': target.exists,
                    'is-disabled': !targetIsWritable(target)
                  }
                ]"
                @click="toggleGlobalTarget(target.id)"
              >
                <div class="target-info">
                  <div class="target-icon">
                    <i class="fa-solid fa-globe"></i>
                  </div>
                  <div class="target-info-text">
                    <div class="target-name-row">
                      <p class="target-name">{{ target.name }}</p>
                      <span v-if="target.exists" class="target-exists-badge">{{ t('install.dirExists') }}</span>
                      <span
                        v-if="!targetIsWritable(target)"
                        class="target-error-badge"
                        :title="target.writeError"
                      >
                        {{ t('install.dirNotWritable') }}
                      </span>
                    </div>
                    <p class="target-path font-mono">{{ formatPath(target.path, 64) }}</p>
                  </div>
                </div>
                <div :class="['checkbox-box', { checked: selectedGlobalTargetIds.includes(target.id) }]">
                  <i v-if="selectedGlobalTargetIds.includes(target.id)" class="fa-solid fa-check"></i>
                </div>
              </div>
              </div>
            </template>
          </div>

          <!-- Tab: project agents -->
          <div v-else-if="installTargetTab === 'project'" class="install-tab-panel">
            <p class="settings-hint">{{ t('install.projectHint') }}</p>

            <div class="project-step">
              <label class="field-label step-label">{{ t('install.projectRoot') }}</label>
              <div class="project-root-picker">
                <div class="target-option compact" :class="{ selected: installProjectRootPicked }">
                  <div class="target-info">
                    <div class="target-icon">
                      <i class="fa-solid fa-folder-tree"></i>
                    </div>
                    <div class="target-info-text">
                      <p class="target-path font-mono">
                        {{ installProjectRoot ? formatPath(installProjectRoot, 64) : t('install.pickProject') }}
                      </p>
                    </div>
                  </div>
                  <button type="button" class="btn-ghost pick-dir-btn" @click="pickInstallProjectRoot">
                    {{ t('install.pickProjectBtn') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="project-step" :class="{ 'step-disabled': projectAgentStepDisabled }">
              <label class="field-label step-label">{{ t('install.agentDirs') }}</label>
              <p v-if="projectAgentStepDisabled" class="settings-hint step-hint">
                {{ t('install.projectStepHint') }}
              </p>
              <p v-else-if="selectedProjectTargetIds.length" class="selection-count">
                {{ t('install.selectedRelative', { count: selectedProjectTargetIds.length }) }}
              </p>
              <div class="target-list-filter search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input
                  v-model="agentTargetFilter"
                  type="search"
                  :placeholder="t('search.agentFilter')"
                  :disabled="projectAgentStepDisabled"
                  @click.stop
                />
              </div>
              <div
                v-if="!projectAgentStepDisabled && !filteredProjectTargets.length"
                class="empty-hint"
              >
                {{ t('install.noAgentMatch') }}
              </div>
              <div class="target-list">
                <div
                  v-for="target in filteredProjectTargets"
                  :key="target.id"
                  :class="[
                    'target-option',
                    {
                      selected: selectedProjectTargetIds.includes(target.id),
                      'target-exists': target.exists,
                      'is-disabled': projectAgentStepDisabled || !targetIsWritable(target)
                    }
                  ]"
                  @click="toggleProjectTarget(target.id)"
                >
                  <div class="target-info">
                    <div class="target-icon">
                      <i class="fa-solid fa-robot"></i>
                    </div>
                    <div class="target-info-text">
                      <div class="target-name-row">
                        <p class="target-name">{{ target.name }}</p>
                        <span v-if="target.exists" class="target-exists-badge">{{ t('install.dirExists') }}</span>
                        <span
                          v-if="!targetIsWritable(target)"
                          class="target-error-badge"
                          :title="target.writeError"
                        >
                          {{ t('install.dirNotWritable') }}
                        </span>
                      </div>
                      <p class="target-rel font-mono">{{ target.relPath }}</p>
                    </div>
                  </div>
                  <div
                    :class="[
                      'checkbox-box',
                      { checked: selectedProjectTargetIds.includes(target.id) }
                    ]"
                  >
                    <i
                      v-if="selectedProjectTargetIds.includes(target.id)"
                      class="fa-solid fa-check"
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: custom folders -->
          <div v-else class="install-tab-panel">
            <p class="settings-hint">{{ t('install.customHint') }}</p>
            <div class="custom-dir-toolbar">
              <button type="button" class="btn-ghost pick-dir-btn" @click="pickCustomInstallDir">
                <i class="fa-solid fa-plus"></i> {{ t('install.addDir') }}
              </button>
              <span v-if="selectedCustomDirs.length" class="selection-count">
                {{ t('install.selected', { count: selectedCustomDirs.length }) }}
              </span>
            </div>
            <div v-if="!customDirOptions.length" class="empty-hint">{{ t('install.addDirEmpty') }}</div>
            <div v-else class="target-list">
              <div
                v-for="dir in customDirOptions"
                :key="dir"
                :class="['target-option', { selected: selectedCustomDirs.includes(dir) }]"
                @click="toggleCustomDir(dir)"
              >
                <div class="target-info">
                  <div class="target-icon">
                    <i class="fa-solid fa-folder-open"></i>
                  </div>
                  <div class="target-info-text">
                    <p class="target-path font-mono">{{ formatPath(dir, 64) }}</p>
                  </div>
                </div>
                <div :class="['checkbox-box', { checked: selectedCustomDirs.includes(dir) }]">
                  <i v-if="selectedCustomDirs.includes(dir)" class="fa-solid fa-check"></i>
                </div>
              </div>
            </div>
          </div>

        </div>
        <div class="modal-footer install-modal-footer">
          <div class="install-footer-options">
            <label class="label-row footer-label-row">
              <input v-model="installOverwrite" type="checkbox" />
              {{ t('install.overwrite') }}
            </label>
            <label v-if="installNestedWarn" class="label-row footer-label-row">
              <input v-model="installAcceptNested" type="checkbox" />
              {{ t('install.nestedConfirm') }}
            </label>
          </div>
          <div class="install-footer-actions">
            <button class="btn-ghost" @click="installModalOpen = false">{{ t('install.cancel') }}</button>
            <button
              class="btn-primary"
              :disabled="installing || installVersionsLoading || (installKind === 'skill' && !installVersion) || !canConfirmInstall"
              @click="confirmInstall"
            >
              <i v-if="installing" class="fa-solid fa-circle-notch fa-spin"></i>
              {{ t('install.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Update Modal -->
    <div v-if="updateModalOpen" class="modal-overlay" @click.self="updateModalOpen = false">
      <div class="modal-panel glass-panel">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-rotate text-indigo"></i>
            {{ t('update.title', { skillId: updateSkill?.skillId }) }}
          </h3>
          <button class="btn-icon" @click="updateModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <label class="field-label">{{ t('update.version') }}</label>
          <VersionSelect v-model="updateSelectedVersion" :versions="updateVersions" :disabled="updating">
            <template #actions>
              <button type="button" class="btn-ghost version-detail-btn" @click="openUpdateVersionOnline('detail')">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                {{ t('update.viewOnline') }}
              </button>
              <button
                v-if="canOpenUpdateVersionDiff"
                type="button"
                class="btn-ghost version-detail-btn"
                @click="openUpdateVersionOnline('diff')"
              >
                <i class="fa-solid fa-code-compare"></i>
                {{ t('update.compareInstalled') }}
              </button>
            </template>
          </VersionSelect>

          <div v-if="updateInstallPaths.length" style="margin-top: 1rem">
            <label class="field-label">{{ t('update.pickDirs') }}</label>
            <label
              v-for="inst in updateInstallPaths"
              :key="inst.installPath"
              class="label-row"
            >
              <input
                type="checkbox"
                :checked="updateSelectedPaths.includes(inst.installPath)"
                @change="toggleUpdatePath(inst.installPath)"
              />
              <code class="font-mono">{{ inst.installPath }}</code>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="updateModalOpen = false">{{ t('update.cancel') }}</button>
          <button class="btn-primary" :disabled="!canConfirmUpdate" @click="confirmUpdate">
            <i v-if="updating" class="fa-solid fa-circle-notch fa-spin"></i>
            {{ t('update.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="deleteModalOpen" class="modal-overlay" @click.self="deleteModalOpen = false">
      <div class="modal-panel glass-panel delete-modal">
        <div class="modal-header">
          <h3>
            <i class="fa-solid fa-trash-can text-danger"></i>
            {{ t('delete.title', { skillId: deleteSkill?.skillId }) }}
          </h3>
          <button class="btn-icon" @click="deleteModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>{{ t('delete.warning') }}</span>
          </div>

          <div class="delete-selection-toolbar">
            <button type="button" class="btn-ghost" @click="toggleDeleteAllPaths">
              <i
                class="fa-solid"
                :class="allDeletePathsSelected ? 'fa-square-check' : 'fa-list-check'"
              ></i>
              {{ allDeletePathsSelected ? t('delete.clearAll') : t('delete.selectAll') }}
            </button>
            <span class="selection-count">
              {{ t('delete.selected', { count: deleteSelectedPaths.length }) }}
            </span>
          </div>

          <div class="delete-path-list">
            <div
              v-for="inst in deleteInstallPaths"
              :key="inst.installPath"
              :class="['target-option', { selected: deleteSelectedPaths.includes(inst.installPath) }]"
              @click="toggleDeletePath(inst.installPath)"
            >
              <div class="target-info">
                <div class="target-icon danger">
                  <i class="fa-solid fa-folder-minus"></i>
                </div>
                <div class="target-info-text">
                  <p class="target-path font-mono">{{ formatPath(inst.installPath, 72) }}</p>
                  <p v-if="inst.version || inst.ide" class="target-rel font-mono">
                    {{ [inst.version ? `v${inst.version}` : '', inst.ide].filter(Boolean).join(' · ') }}
                  </p>
                </div>
              </div>
              <div :class="['checkbox-box', { checked: deleteSelectedPaths.includes(inst.installPath) }]">
                <i v-if="deleteSelectedPaths.includes(inst.installPath)" class="fa-solid fa-check"></i>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="deleteModalOpen = false">{{ t('delete.cancel') }}</button>
          <button class="btn-danger" :disabled="!canConfirmDelete" @click="confirmDelete">
            <i v-if="deleting" class="fa-solid fa-circle-notch fa-spin"></i>
            <i v-else class="fa-solid fa-trash-can"></i>
            {{ t('delete.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="settingsModalOpen" class="modal-overlay" @click.self="!settingsBusy && (settingsModalOpen = false)" @keydown.esc="!settingsBusy && (settingsModalOpen = false)">
      <div class="modal-panel glass-panel settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="modal-header">
          <h3 id="settings-title">
            <i class="fa-solid fa-sliders text-indigo"></i>
            {{ t('settings.title') }}
          </h3>
          <button class="btn-icon" :aria-label="t('settings.close')" :disabled="settingsBusy" @click="settingsModalOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <nav class="settings-tabs">
            <button
              type="button"
              :class="{ active: settingsTab === 'general' }"
              @click="settingsTab = 'general'"
            >
              <i class="fa-solid fa-gear"></i>
              {{ t('settings.general') }}
            </button>
            <button
              type="button"
              :class="{ active: settingsTab === 'connection' }"
              @click="settingsTab = 'connection'"
            >
              <i class="fa-solid fa-server"></i>
              {{ t('settings.connection') }}
            </button>
          </nav>

          <p v-if="settingsTab === 'general'" class="settings-hint settings-tab-hint">
            {{ t('settings.generalHint') }}
          </p>
          <p v-else class="settings-hint settings-tab-hint">
            {{ t('settings.connectionHint') }}
          </p>

          <div v-if="settingsTab === 'general'" class="settings-tab-panel">
            <label class="field-label">{{ t('settings.language') }}</label>
            <select class="locale-select" :value="locale" @change="onLocaleChange">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>

            <label class="field-label settings-field-spaced">{{ t('settings.theme') }}</label>
            <select class="theme-select" :value="themePreference" @change="onThemeChange">
              <option value="light">{{ t('theme.light') }}</option>
              <option value="dark">{{ t('theme.dark') }}</option>
              <option value="system">{{ t('theme.system') }}</option>
            </select>
          </div>

          <div v-else class="settings-tab-panel">
            <div class="profile-settings-heading">
              <strong>{{ config.profile }}</strong>
              <button
                v-if="!config.profileLocked"
                type="button"
                class="btn-ghost"
                :disabled="settingsBusy"
                :aria-expanded="newProfileOpen"
                @click="newProfileOpen = !newProfileOpen"
              >
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
                {{ t('workspace.addProfile') }}
              </button>
            </div>
            <p v-if="config.profileLocked" class="settings-hint">{{ t('workspace.profileOverride') }}</p>
            <form v-if="newProfileOpen && !config.profileLocked" class="new-profile-form" @submit.prevent="createProfile">
              <label for="new-profile-name" class="field-label">{{ t('workspace.profileName') }}</label>
              <input id="new-profile-name" v-model.trim="newProfileName" type="text" pattern="[A-Za-z0-9._\-]+" required :disabled="settingsBusy" />
              <label for="new-profile-url" class="field-label">{{ t('settings.serverUrl') }}</label>
              <input id="new-profile-url" v-model.trim="newProfileUrl" type="url" placeholder="https://…" required :disabled="settingsBusy" />
              <button class="btn-primary" type="submit" :disabled="settingsBusy">{{ t('workspace.createProfile') }}</button>
            </form>
            <label for="registry-url" class="field-label">{{ t('settings.serverUrl') }}</label>
            <div class="field-row">
              <input id="registry-url" v-model.trim="registryUrl" type="url" class="font-mono" :disabled="profileControlsDisabled" />
              <button class="btn-ghost" :disabled="profileControlsDisabled || !registryUrl || registryUrl === config.baseUrl" @click="saveServer">
                <i v-if="profileBusy" class="fa-solid fa-circle-notch fa-spin"></i>
                {{ profileBusy ? t('settings.saving') : t('settings.save') }}
              </button>
            </div>

            <button type="button" class="btn-ghost login-link" :disabled="settingsBusy" @click="openLoginPage">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
              {{ t('settings.openLogin') }}
            </button>

            <label for="verification-code" class="field-label">{{ t('settings.verificationCode') }}</label>
            <div class="field-row">
              <input
                id="verification-code"
                v-model="verificationCode"
                type="text"
                :placeholder="t('settings.codePlaceholder')"
                class="font-mono"
              />
              <button
                class="btn-ghost"
                :disabled="settingsBusy"
                @click="exchangePat"
              >
                <i
                  class="fa-solid"
                  :class="isExchangingPat ? 'fa-circle-notch fa-spin' : 'fa-key'"
                ></i>
                {{ t('settings.exchangePat') }}
              </button>
            </div>
            <p v-if="patReady" class="pat-status">
              <span class="status-dot small"></span>
              {{
                config.username
                  ? t('settings.patReadyUser', { username: config.username })
                  : t('settings.patReady')
              }}
            </p>

            <div class="settings-actions">
              <button
                class="btn-ghost"
                :disabled="settingsBusy"
                @click="testConnection"
              >
                <i v-if="isTestingConnection" class="fa-solid fa-circle-notch fa-spin"></i>
                {{ t('settings.testConnection') }}
              </button>
              <button
                v-if="patReady"
                class="btn-ghost"
                :disabled="settingsBusy"
                @click="logout"
              >
                {{ t('settings.logout') }}
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" :disabled="settingsBusy" @click="settingsModalOpen = false">{{ t('settings.close') }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped src="./workspace.css"></style>

<style scoped>
.app-layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  -webkit-app-region: drag;
}

.app-layout button,
.app-layout input,
.app-layout select,
.app-layout textarea,
.app-layout a,
.app-layout .nav-btn,
.app-layout .collection-card,
.app-layout .content-toolbar,
.app-layout .content-area,
.app-layout .tag-filter-dropdown,
.app-layout .version-select,
.app-layout .modal-overlay,
.app-layout .modal-panel,
.app-layout .toast {
  -webkit-app-region: no-drag;
}

/* Workspace shell styles are defined in workspace.css. */
.content-toolbar .search-box i {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-base-400);
  font-size: 0.75rem;
  pointer-events: none;
}

.content-toolbar .search-box input {
  width: 100%;
  height: 2rem;
  padding: 0 2rem 0 2.125rem;
  font-size: 0.8125rem;
  line-height: 2rem;
  background: transparent;
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  box-shadow: none;
  color: var(--color-fg-strong);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.content-toolbar .search-box input:hover {
  border-color: var(--color-base-700);
}

.content-toolbar .search-box input:focus {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-accent-ring);
  outline: none;
}

.content-toolbar .search-box input::placeholder {
  color: var(--color-base-400);
}

.content-toolbar .search-clear-btn {
  right: 0.625rem;
}

.search-box {
  position: relative;
  width: 16rem;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-base-400);
  font-size: 0.8125rem;
}

.search-box input {
  width: 100%;
  padding-left: 2.25rem;
  padding-right: 2rem;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
  font-size: 0.8125rem;
}

.search-clear-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-base-400);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  border-radius: 0.25rem;
}

.search-clear-btn:hover {
  color: var(--color-fg-muted);
  background: rgba(var(--color-fg-muted-rgb), 0.1);
}

.market-filter-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.375rem;
  flex-shrink: 0;
}

.content-toolbar--market .filter-chip {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
}

.content-toolbar--market .toolbar-refresh-btn {
  padding: 0.25rem 0.5rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--color-base-800);
  background: rgba(var(--color-base-950-rgb), 0.5);
  color: var(--color-fg-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.filter-chip:hover {
  border-color: var(--color-base-700);
  color: var(--color-fg);
}

.filter-chip--active {
  border-color: var(--accent-border-strong);
  background: var(--accent-bg-subtle);
  color: var(--color-accent-light);
}

.toolbar-refresh-btn {
  padding: 0.35rem 0.6rem;
}

.tag-filter-dropdown {
  position: relative;
}

.tag-filter-badge {
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.25rem;
  border-radius: 9999px;
  background: var(--accent-bg-strong);
  color: var(--color-accent-light);
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.125rem;
  text-align: center;
}

.tag-filter-chevron {
  font-size: 0.625rem;
  opacity: 0.75;
  transition: transform 0.2s ease;
}

.tag-filter-dropdown--open .tag-filter-chevron {
  transform: rotate(180deg);
}

.tag-filter-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 50;
  min-width: 14rem;
  max-width: min(20rem, calc(100vw - 2rem));
  max-height: 11rem;
  display: flex;
  flex-direction: column;
  padding: 0.45rem 0.5rem 0.5rem;
  background: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  border-radius: 0.625rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.tag-filter-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-bottom: 0.35rem;
}

.tag-filter-hint {
  margin: 0;
  padding: 0.15rem 0.25rem 0 0;
  flex: 1;
  min-width: 0;
  font-size: 0.625rem;
  color: var(--color-base-400);
  line-height: 1.35;
}

.tag-filter-clear {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  padding: 0.25rem 0.4rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-base-800);
  background: transparent;
  font-size: 0.625rem;
  color: var(--color-base-400);
  cursor: pointer;
}

.tag-filter-clear:hover {
  border-color: var(--color-base-700);
  color: var(--color-fg-muted);
}

.tag-filter-options {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tag-filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-fg-muted);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

.tag-filter-option:hover {
  background: rgba(var(--color-fg-muted-rgb), 0.08);
  color: var(--color-fg-strong);
}

.tag-filter-option--active {
  background: var(--accent-bg-subtle);
  color: var(--color-accent-light);
}

.tag-filter-option-check {
  flex-shrink: 0;
  width: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-soft);
}

.tag-filter-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 2rem 2rem;
  container-type: inline-size;
  container-name: skill-content;
}

.collection-skill-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.version-tag {
  font-size: 0.6875rem;
  background: var(--color-base-900);
  color: var(--color-fg-muted);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-base-800);
  font-family: ui-monospace, monospace;
}

.market-detail-btn {
  color: var(--color-base-400) !important;
}

.market-detail-btn:hover {
  color: var(--color-accent-light) !important;
  background: var(--accent-bg-subtle) !important;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@container skill-content (min-width: 72rem) {
  .collection-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.collection-card {
  display: flex;
  align-items: stretch;
  gap: 1rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.75rem;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.collection-card:hover {
  border-color: var(--accent-border-strong);
  transform: translateY(-1px);
}

.collection-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.collection-card-body h3 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  color: var(--color-fg-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-card-body p,
.collection-hero-main p,
.collection-skill-row p {
  margin: 0;
  color: var(--color-base-400);
  font-size: 0.75rem;
  line-height: 1.5;
}

.collection-card-body p {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.collection-cover {
  width: 7rem;
  min-height: 9rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--accent-border-mid);
  background:
    linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.24), transparent 62%),
    rgba(var(--color-base-900-rgb), 0.7);
  box-shadow: inset -0.5rem 0 0 rgba(0, 0, 0, 0.12);
}

.collection-cover--small {
  width: 5.75rem;
  min-height: 7.5rem;
}

.collection-cover-kicker,
.collection-cover span {
  color: var(--color-base-400);
  font-size: 0.625rem;
  font-family: ui-monospace, monospace;
}

.collection-cover strong {
  color: var(--color-heading);
  font-size: 0.875rem;
  line-height: 1.2;
  word-break: break-word;
}

.collection-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.collection-detail-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.collection-hero {
  display: flex;
  gap: 1.25rem;
  align-items: stretch;
  padding: 1rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.75rem;
  margin-bottom: 1rem;
}

.collection-hero-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.collection-hero-main h2 {
  margin: 0 0 0.5rem;
  color: var(--color-heading);
}

.collection-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.75rem;
  color: var(--color-base-400);
  font-size: 0.6875rem;
  font-family: ui-monospace, monospace;
}

.collection-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.collection-skill-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.625rem;
}

.skill-list-index {
  width: 1.5rem;
  flex-shrink: 0;
  color: var(--color-base-400);
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
}

.skill-list-main {
  flex: 1;
  min-width: 0;
}

.skill-list-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.skill-list-title-row h3 {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9375rem;
  color: var(--color-fg-strong);
}

.install-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  color: var(--color-fg-muted);
  background: rgba(var(--color-base-950-rgb), 0.45);
}

.settings-modal {
  width: min(32rem, 94vw);
}

.settings-tabs {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
  padding: 0.25rem;
  background: rgba(var(--color-base-950-rgb), 0.6);
  border-radius: 0.5rem;
  border: 1px solid var(--color-base-800);
}

.settings-tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-fg-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-tabs button:hover {
  color: var(--color-fg-strong);
  background: rgba(var(--color-base-800-rgb), 0.4);
}

.settings-tabs button.active {
  color: var(--color-accent-lighter);
  background: var(--accent-bg-strong);
  border-color: var(--accent-border-mid);
  box-shadow: var(--shadow-accent-inset-sm);
}

.settings-tabs button i {
  font-size: 0.8125rem;
}

.settings-tab-hint {
  margin-top: 0;
  margin-bottom: 1rem;
}

.settings-tab-panel {
  min-height: 10rem;
}

.settings-field-spaced {
  margin-top: 1rem;
}

.locale-select,
.theme-select {
  margin-bottom: 0.75rem;
  line-height: 1.25;
  appearance: none;
  -webkit-appearance: none;
  padding-right: 2rem;
  background-color: rgba(var(--color-base-900-rgb), 0.8);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
}

.field-row input {
  flex: 1;
  line-height: 1.25;
}

.settings-hint {
  font-size: 0.75rem;
  color: var(--color-fg-muted);
  line-height: 1.6;
  margin: 0 0 1.25rem;
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-fg-muted);
  margin-bottom: 0.375rem;
}

.field-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.font-mono {
  font-family: ui-monospace, 'JetBrains Mono', monospace;
}

.login-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-warning-alt);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  margin-bottom: 1.25rem;
}

.login-link:hover {
  color: var(--color-warning);
}

.pat-status {
  font-size: 0.75rem;
  color: var(--color-success-light);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
}

.settings-actions {
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--color-base-900-rgb), 0.6);
  display: flex;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-base-400);
}

.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--accent-border-strong);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: var(--shadow-toast);
  z-index: 60;
  pointer-events: none;
}

.toast i {
  color: var(--color-accent-soft);
}

.toast span {
  font-size: 0.875rem;
  color: var(--color-heading);
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-base-800);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(var(--color-base-900-rgb), 0.5);
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-fg-strong);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.text-indigo {
  color: var(--color-accent-soft);
}

.text-danger {
  color: var(--color-danger);
}

.delete-modal {
  width: min(640px, 94vw);
}

.delete-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  color: var(--color-danger);
  background: rgba(var(--color-danger-rgb), 0.1);
  border: 1px solid rgba(var(--color-danger-rgb), 0.24);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.delete-warning i {
  margin-top: 0.125rem;
  flex-shrink: 0;
}

.delete-selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.delete-path-list {
  max-height: 18rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.target-icon.danger {
  color: var(--color-danger);
  border-color: rgba(var(--color-danger-rgb), 0.25);
  background: rgba(var(--color-danger-rgb), 0.08);
}

.target-list-filter {
  width: 100%;
  margin-bottom: 0.625rem;
}

.target-list-filter input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.target-list {
  max-height: 14rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.install-target-tabs {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
  background: rgba(var(--color-base-950-rgb), 0.6);
  border-radius: 0.5rem;
  border: 1px solid var(--color-base-800);
}

.install-target-tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-fg-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.install-target-tabs button:hover {
  color: var(--color-fg-strong);
  background: rgba(var(--color-base-800-rgb), 0.4);
}

.install-target-tabs button.active {
  color: var(--color-accent-lighter);
  background: var(--accent-bg-strong);
  border-color: var(--accent-border-mid);
  box-shadow: var(--shadow-accent-inset-sm);
}

.install-target-tabs button i {
  font-size: 0.8125rem;
}

.install-tab-panel {
  min-height: 8rem;
}

.project-step {
  margin-bottom: 1rem;
}

.project-step.step-disabled {
  opacity: 0.55;
}

.project-step.step-disabled .target-list {
  pointer-events: none;
}

.target-option.is-disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.target-option.is-disabled:hover {
  border-color: var(--color-base-800);
}

.target-option.target-exists:not(.selected) {
  border-color: rgba(var(--color-success-rgb), 0.35);
  background: rgba(var(--color-success-rgb), 0.07);
}

.target-option.target-exists:not(.selected):hover {
  border-color: rgba(var(--color-success-rgb), 0.55);
  background: rgba(var(--color-success-rgb), 0.1);
}

.target-option.target-exists .target-icon {
  color: var(--color-success-light);
  border-color: rgba(var(--color-success-rgb), 0.35);
}

.target-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.125rem;
}

.target-exists-badge {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--color-success-light);
  background: rgba(var(--color-success-rgb), 0.12);
  border: 1px solid rgba(var(--color-success-rgb), 0.28);
  border-radius: 9999px;
  padding: 0.0625rem 0.4375rem;
  line-height: 1.4;
  white-space: nowrap;
}

.step-label {
  margin-bottom: 0.5rem;
}

.step-hint {
  margin: 0;
}

.selection-count {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--color-accent-soft);
  margin-bottom: 0.5rem;
}

.custom-dir-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.project-root-row {
  margin-bottom: 0.75rem;
}

.project-root-picker .target-option.compact {
  margin-bottom: 0;
}

.empty-hint {
  padding: 1.25rem 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-base-400);
  border: 1px dashed var(--color-base-800);
  border-radius: 0.5rem;
  background: rgba(var(--color-base-950-rgb), 0.35);
}

.target-rel {
  font-size: 0.6875rem;
  color: var(--color-accent-soft);
  margin: 0.125rem 0;
}

.target-info-text {
  min-width: 0;
  flex: 1;
}

.pick-dir-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.target-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.target-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-fg-muted);
  flex-shrink: 0;
}

.target-option.selected .target-icon {
  color: var(--color-accent-soft);
}

.target-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-fg);
  margin: 0;
}

.target-option.selected .target-name {
  color: var(--color-accent-lighter);
}

.target-path {
  font-size: 0.6875rem;
  color: var(--color-base-400);
  margin: 0.125rem 0 0;
  word-break: break-all;
}

.target-option.selected .target-path {
  color: rgba(var(--color-accent-soft-rgb), 0.7);
}

code {
  font-size: 0.75rem;
  background: var(--color-base-950);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-base-800);
  color: var(--color-accent-soft);
}

</style>
