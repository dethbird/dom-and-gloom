export function conceal(source: HTMLElement) {
  const style = source.style;
  const hadStyle = source.hasAttribute('style');
  const properties = [
    { name: 'transition-property', applied: 'none' },
    { name: 'opacity', applied: '0' },
  ].map((property) => ({
    ...property,
    value: style.getPropertyValue(property.name),
    priority: style.getPropertyPriority(property.name),
  }));

  for (const { name, applied } of properties) style.setProperty(name, applied, 'important');

  return () => {
    // Restore opacity while transitions are still suppressed.
    for (const { name, applied, value, priority } of [...properties].reverse()) {
      if (style.getPropertyValue(name) !== applied || style.getPropertyPriority(name) !== 'important') continue;
      if (value) style.setProperty(name, value, priority);
      else style.removeProperty(name);
      if (name === 'opacity' && source.isConnected) void getComputedStyle(source).opacity;
    }
    if (!hadStyle && !style.length) source.removeAttribute('style');
  };
}
