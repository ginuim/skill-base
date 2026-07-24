(function () {
  var RELEASE_API = 'https://api.github.com/repos/ginuim/skill-base/releases/tags/desktop-latest';
  var RELEASE_PAGE = 'https://github.com/ginuim/skill-base/releases/tag/desktop-latest';

  function getPageLang() {
    return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  }

  function t(zh, en) {
    return getPageLang() === 'en' ? en : zh;
  }

  function detectPlatform() {
    var ua = navigator.userAgent || '';
    var platform = navigator.platform || '';
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'mac';
    if (/Linux/i.test(platform) || /Linux/i.test(ua) || /X11/i.test(ua)) return 'linux';
    return 'unknown';
  }


  function normalizeAssets(assets) {
    var branded = assets.filter(function (a) {
      return /^SkillBase-/i.test(a.name);
    });
    return branded.length ? branded : assets;
  }

  function assetScore(name) {
    var score = 0;
    if (/^SkillBase-/i.test(name)) score += 10;
    if (/macos/i.test(name)) score += 2;
    if (/linux/i.test(name)) score += 2;
    if (/windows/i.test(name)) score += 2;
    return score;
  }

  function bestAsset(assets, filterFn) {
    var matches = assets.filter(filterFn);
    matches.sort(function (a, b) {
      return assetScore(b.name) - assetScore(a.name);
    });
    return matches[0] || null;
  }

  function pickMacAsset(assets) {
    return bestAsset(assets, function (a) {
      return /\.dmg$/i.test(a.name);
    });
  }

  function pickWindowsAsset(assets) {
    return bestAsset(assets, function (a) {
      return /-setup\.exe$/i.test(a.name) || /\.exe$/i.test(a.name);
    });
  }

  function pickLinuxAppImage(assets) {
    return bestAsset(assets, function (a) {
      return /\.AppImage$/i.test(a.name);
    });
  }

  function pickLinuxDeb(assets) {
    return bestAsset(assets, function (a) {
      return /\.deb$/i.test(a.name);
    });
  }

  function pickPrimaryAsset(assets) {
    var platform = detectPlatform();
    if (platform === 'mac') return pickMacAsset(assets);
    if (platform === 'windows') return pickWindowsAsset(assets);
    if (platform === 'linux') return pickLinuxAppImage(assets);
    return null;
  }

  function extractVersion(assets) {
    for (var i = 0; i < assets.length; i++) {
      var match = assets[i].name.match(/(\d+\.\d+\.\d+)/);
      if (match) return match[1];
    }
    return '';
  }

  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return '';
    var mb = bytes / (1024 * 1024);
    if (mb >= 100) return Math.round(mb) + ' MB';
    return mb.toFixed(1) + ' MB';
  }

  function platformLabel(key) {
    var labels = {
      mac: { zh: 'macOS', en: 'macOS' },
      windows: { zh: 'Windows', en: 'Windows' },
      linuxAppImage: { zh: 'Linux · AppImage', en: 'Linux · AppImage' },
      linuxDeb: { zh: 'Linux · deb', en: 'Linux · deb' }
    };
    var item = labels[key];
    if (!item) return key;
    return t(item.zh, item.en);
  }

  function primaryButtonLabel(asset) {
    var platform = detectPlatform();
    if (platform === 'mac') {
      return t('下载 macOS 版', 'Download for macOS');
    }
    if (platform === 'windows') {
      return t('下载 Windows 版', 'Download for Windows');
    }
    if (platform === 'linux') {
      return t('下载 Linux 版', 'Download for Linux');
    }
    return t('下载桌面客户端', 'Download desktop app');
  }

  function renderDownloadCard(asset, key, isRecommended) {
    if (!asset) return '';
    var size = formatSize(asset.size);
    var badge = isRecommended
      ? '<span class="desktop-download-badge">' + t('推荐', 'Recommended') + '</span>'
      : '';
    return (
      '<a class="desktop-download-card' + (isRecommended ? ' is-recommended' : '') + '" href="' + asset.browser_download_url + '" rel="noopener noreferrer">' +
        '<span class="desktop-download-card-head">' +
          '<span class="desktop-download-card-title">' + platformLabel(key) + '</span>' +
          badge +
        '</span>' +
        '<span class="desktop-download-card-file">' + asset.name + '</span>' +
        (size ? '<span class="desktop-download-card-size">' + size + '</span>' : '') +
      '</a>'
    );
  }

  function setHeroDownload(asset, version) {
    var heroBtn = document.getElementById('hero-desktop-download');
    var heroMeta = document.getElementById('hero-desktop-meta');
    if (!heroBtn) return;

    if (asset) {
      heroBtn.href = asset.browser_download_url;
      heroBtn.hidden = false;
      heroBtn.querySelector('[data-desktop-label]').textContent = primaryButtonLabel(asset);
    } else {
      heroBtn.href = RELEASE_PAGE;
      heroBtn.hidden = false;
      heroBtn.querySelector('[data-desktop-label]').textContent = t('查看桌面版下载', 'View desktop downloads');
    }

    if (heroMeta && version) {
      heroMeta.hidden = false;
      heroMeta.textContent = t('最新桌面版 v' + version, 'Latest desktop v' + version);
    }
  }

  var cachedAssets = null;

  function renderPanel(assets) {
    if (assets && assets.length) cachedAssets = assets;
    assets = assets || cachedAssets || [];
    var primaryWrap = document.getElementById('desktop-download-primary');
    var grid = document.getElementById('desktop-download-grid');
    if (!primaryWrap || !grid) return;

    var mac = pickMacAsset(assets);
    var windows = pickWindowsAsset(assets);
    var linuxAppImage = pickLinuxAppImage(assets);
    var linuxDeb = pickLinuxDeb(assets);
    var primary = pickPrimaryAsset(assets);
    var platform = detectPlatform();
    var version = extractVersion(assets);

    setHeroDownload(primary, version);

    if (primary) {
      primaryWrap.innerHTML =
        '<a class="btn btn-primary desktop-download-main" href="' + primary.browser_download_url + '" rel="noopener noreferrer">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
            '<polyline points="7 10 12 15 17 10"/>' +
            '<line x1="12" y1="15" x2="12" y2="3"/>' +
          '</svg>' +
          '<span>' + primaryButtonLabel(primary) + '</span>' +
        '</a>' +
        (version ? '<p class="desktop-download-version">' + t('版本 ', 'Version ') + version + '</p>' : '');
    } else {
      primaryWrap.innerHTML =
        '<a class="btn btn-primary desktop-download-main" href="' + RELEASE_PAGE + '" target="_blank" rel="noopener noreferrer">' +
          t('前往 GitHub 下载', 'Download on GitHub') +
        '</a>';
    }

    var cards = [
      { asset: mac, key: 'mac', recommended: platform === 'mac' },
      { asset: windows, key: 'windows', recommended: platform === 'windows' },
      { asset: linuxAppImage, key: 'linuxAppImage', recommended: platform === 'linux' },
      { asset: linuxDeb, key: 'linuxDeb', recommended: false }
    ];

    grid.innerHTML = cards
      .filter(function (item) { return item.asset; })
      .map(function (item) {
        return renderDownloadCard(item.asset, item.key, item.recommended);
      })
      .join('');
  }

  function renderError() {
    var primaryWrap = document.getElementById('desktop-download-primary');
    var grid = document.getElementById('desktop-download-grid');
    setHeroDownload(null, '');

    if (primaryWrap) {
      primaryWrap.innerHTML =
        '<a class="btn btn-primary desktop-download-main" href="' + RELEASE_PAGE + '" target="_blank" rel="noopener noreferrer">' +
          t('前往 GitHub 下载', 'Download on GitHub') +
        '</a>' +
        '<p class="desktop-download-version">' + t('暂时无法获取最新安装包，请从 Release 页下载。', 'Could not load installers. Use the release page.') + '</p>';
    }
    if (grid) grid.innerHTML = '';
  }

  function initDesktopDownload() {
    fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('release fetch failed');
        return res.json();
      })
      .then(function (release) {
        renderPanel(normalizeAssets(release.assets || []));
      })
      .catch(function () {
        renderError();
      });
  }

  window.initDesktopDownload = initDesktopDownload;
  window.refreshDesktopDownloadLabels = function () {
    if (cachedAssets) {
      renderPanel(cachedAssets);
      return;
    }
    var heroBtn = document.getElementById('hero-desktop-download');
    if (heroBtn && heroBtn.querySelector('[data-desktop-label]')) {
      heroBtn.querySelector('[data-desktop-label]').textContent = primaryButtonLabel(null);
    }
  };
})();
