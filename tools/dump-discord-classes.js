/*
 * LiquidGlassCord Discord class dumper
 * Version: 1.1.0
 * Author: Awizz
 *
 * Paste this whole file into Discord DevTools Console, then send the downloaded JSON to ChatGPT.
 * It does not export messages, usernames, channels, server names, or private text content.
 * It exports DOM class names, element sizes, and computed visual styles only.
 */
(() => {
  const app = document.querySelector('#app-mount') || document.body;
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const all = Array.from(app.querySelectorAll('*'));

  const safeNumber = value => Number.isFinite(value) ? Math.round(value) : 0;

  const rgbaAlpha = value => {
    if (!value || value === 'transparent') return 0;
    const colorFunction = String(value).match(/rgba?\(([^)]+)\)/i);
    if (!colorFunction) {
      if (String(value).includes('/ 0')) return 0;
      if (String(value).includes('/ 0.')) {
        const slashAlpha = Number(String(value).split('/').pop().replace(')', '').trim());
        return Number.isFinite(slashAlpha) ? slashAlpha : 1;
      }
      return 1;
    }
    const parts = colorFunction[1].split(',').map(v => v.trim());
    if (parts.length < 4) return 1;
    const alpha = Number(parts[3]);
    return Number.isFinite(alpha) ? alpha : 1;
  };

  const shortSelector = el => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      const classes = Array.from(node.classList || []).slice(0, 4);
      if (classes.length) part += '.' + classes.map(c => CSS.escape(c)).join('.');
      if (node.id && node.id === 'app-mount') part += '#app-mount';
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const classMap = new Map();
  const visualSurfaces = [];
  const rootVariables = {};
  const rootStyle = getComputedStyle(document.documentElement);

  const possibleVars = [
    '--background-primary', '--background-secondary', '--background-secondary-alt', '--background-tertiary',
    '--background-floating', '--background-modifier-hover', '--background-modifier-selected',
    '--bg-base-primary', '--bg-base-secondary', '--bg-base-tertiary', '--background-base-lowest',
    '--background-base-lower', '--background-base-low', '--background-surface-low', '--background-surface-high',
    '--text-normal', '--text-muted', '--header-primary', '--header-secondary', '--interactive-normal',
    '--channeltextarea-background', '--input-background', '--modal-background', '--custom-app-panels-height'
  ];

  for (const name of possibleVars) {
    rootVariables[name] = rootStyle.getPropertyValue(name).trim();
  }

  for (const el of all) {
    const classes = Array.from(el.classList || []);
    if (!classes.length) continue;

    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const backgroundColor = style.backgroundColor;
    const backgroundImage = style.backgroundImage;
    const backdropFilter = style.backdropFilter || style.webkitBackdropFilter || 'none';
    const boxShadow = style.boxShadow;
    const borderTopColor = style.borderTopColor;
    const alpha = rgbaAlpha(backgroundColor);

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
          backgroundImage: backgroundImage === 'none' ? 'none' : backgroundImage.slice(0, 220),
          backdropFilter,
          borderRadius: style.borderRadius,
          boxShadow: boxShadow === 'none' ? 'none' : boxShadow.slice(0, 220)
        });
      }
    }

    const area = rect.width * rect.height;
    const hasVisualSurface =
      alpha > 0.035 ||
      (backgroundImage && backgroundImage !== 'none') ||
      (backdropFilter && backdropFilter !== 'none') ||
      (boxShadow && boxShadow !== 'none') ||
      rgbaAlpha(borderTopColor) > 0.035;

    if (hasVisualSurface && rect.width > 8 && rect.height > 8) {
      visualSurfaces.push({
        selector: shortSelector(el),
        classes,
        tag: el.tagName.toLowerCase(),
        width: safeNumber(rect.width),
        height: safeNumber(rect.height),
        area: safeNumber(area),
        backgroundColor,
        backgroundAlpha: alpha,
        backgroundImage: backgroundImage === 'none' ? 'none' : backgroundImage.slice(0, 260),
        backdropFilter,
        borderRadius: style.borderRadius,
        boxShadow: boxShadow === 'none' ? 'none' : boxShadow.slice(0, 260),
        borderTopColor,
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

  const sortedSurfaces = visualSurfaces
    .sort((a, b) => b.area - a.area || b.backgroundAlpha - a.backgroundAlpha)
    .slice(0, 1800);

  const dump = {
    tool: 'LiquidGlassCord Discord class dumper',
    version: '1.1.0',
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
      visualSurfaces: sortedSurfaces.length,
      visualSurfacesBeforeLimit: visualSurfaces.length
    },
    rootVariables,
    classes,
    visualSurfaces: sortedSurfaces
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
    `%cLiquidGlassCord dump created%c ${classes.length} unique classes, ${sortedSurfaces.length}/${visualSurfaces.length} visual surfaces exported.`,
    'color:#8ec5ff;font-weight:700',
    'color:inherit'
  );
})();
