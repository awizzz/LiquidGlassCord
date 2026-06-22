/*
 * LiquidGlassCord Discord class dumper
 * Paste this whole file into Discord DevTools Console, then send the downloaded JSON to ChatGPT.
 * It does not export messages, usernames, or private text content: only DOM class names and computed visual styles.
 */
(() => {
  const app = document.querySelector('#app-mount') || document.body;
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const all = Array.from(app.querySelectorAll('*'));

  const safeNumber = value => Number.isFinite(value) ? Math.round(value) : 0;

  const rgbaAlpha = value => {
    if (!value || value === 'transparent') return 0;
    const rgba = value.match(/rgba?\(([^)]+)\)/i);
    if (!rgba) return 1;
    const parts = rgba[1].split(',').map(v => v.trim());
    if (parts.length < 4) return 1;
    const alpha = Number(parts[3]);
    return Number.isFinite(alpha) ? alpha : 1;
  };

  const shortSelector = el => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      const classes = Array.from(node.classList || []).slice(0, 3);
      if (classes.length) part += '.' + classes.map(c => CSS.escape(c)).join('.');
      if (node.id) part += '#' + CSS.escape(node.id);
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const classMap = new Map();
  const surfaces = [];
  const rootVars = {};
  const rootStyle = getComputedStyle(document.documentElement);

  for (const name of rootStyle) {
    if (name.startsWith('--')) rootVars[name] = rootStyle.getPropertyValue(name).trim();
  }

  for (const el of all) {
    const classes = Array.from(el.classList || []);
    if (!classes.length) continue;

    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const backgroundColor = style.backgroundColor;
    const backgroundImage = style.backgroundImage;
    const backdropFilter = style.backdropFilter || style.webkitBackdropFilter || 'none';
    const hasVisualSurface =
      rgbaAlpha(backgroundColor) > 0.05 ||
      (backgroundImage && backgroundImage !== 'none') ||
      (backdropFilter && backdropFilter !== 'none') ||
      (style.boxShadow && style.boxShadow !== 'none') ||
      (style.borderTopColor && rgbaAlpha(style.borderTopColor) > 0.05);

    for (const cls of classes) {
      if (!classMap.has(cls)) {
        classMap.set(cls, {
          className: cls,
          count: 0,
          tags: {},
          examples: []
        });
      }
      const item = classMap.get(cls);
      item.count += 1;
      item.tags[el.tagName.toLowerCase()] = (item.tags[el.tagName.toLowerCase()] || 0) + 1;
      if (item.examples.length < 4) {
        item.examples.push({
          selector: shortSelector(el),
          tag: el.tagName.toLowerCase(),
          width: safeNumber(rect.width),
          height: safeNumber(rect.height),
          backgroundColor,
          backgroundImage: backgroundImage === 'none' ? 'none' : backgroundImage.slice(0, 180),
          backdropFilter,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow === 'none' ? 'none' : style.boxShadow.slice(0, 180)
        });
      }
    }

    if (hasVisualSurface && rect.width > 16 && rect.height > 16 && surfaces.length < 900) {
      surfaces.push({
        selector: shortSelector(el),
        classes,
        tag: el.tagName.toLowerCase(),
        width: safeNumber(rect.width),
        height: safeNumber(rect.height),
        backgroundColor,
        backgroundAlpha: rgbaAlpha(backgroundColor),
        backgroundImage: backgroundImage === 'none' ? 'none' : backgroundImage.slice(0, 220),
        backdropFilter,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow === 'none' ? 'none' : style.boxShadow.slice(0, 220),
        borderTopColor: style.borderTopColor,
        opacity: style.opacity,
        display: style.display,
        position: style.position,
        zIndex: style.zIndex
      });
    }
  }

  const classes = Array.from(classMap.values())
    .map(item => ({
      ...item,
      tags: Object.entries(item.tags).sort((a, b) => b[1] - a[1])
    }))
    .sort((a, b) => b.count - a.count || a.className.localeCompare(b.className));

  const dump = {
    tool: 'LiquidGlassCord Discord class dumper',
    version: '1.0.0',
    exportedAt: now.toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    },
    totals: {
      elements: all.length,
      uniqueClasses: classes.length,
      visualSurfaces: surfaces.length
    },
    rootVariables: rootVars,
    classes,
    visualSurfaces: surfaces
  };

  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `liquidglasscord-discord-class-dump-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);

  console.log(
    `%cLiquidGlassCord dump created%c ${classes.length} unique classes, ${surfaces.length} visual surfaces.`,
    'color:#8ec5ff;font-weight:700',
    'color:inherit'
  );
})();
