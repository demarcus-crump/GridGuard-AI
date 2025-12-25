# Theme System — GridGuard AI

> **Version:** 3.1.0  
> **Last Updated:** 2025-12-24

---

## Overview

GridGuard AI implements a complete Light/Dark theming system using CSS custom properties (variables). The system supports:

- **OS Preference Detection** — Respects `prefers-color-scheme` for first-time visitors
- **User Override** — Toggle saves preference to `localStorage`
- **Persistence** — Theme persists across sessions
- **Reactive Updates** — Charts and visualizations respond to theme changes

---

## CSS Variable System

### Location

Theme variables are defined in `index.html` within the `<style>` block:

### Dark Mode (Default)

```css
:root {
  --bg-primary: #0D1117;
  --bg-secondary: #161B22;
  --bg-tertiary: #21262D;
  --bg-hover: #30363D;
  --text-primary: #F0F6FC;
  --text-secondary: #8B949E;
  --text-muted: #6E7681;
  --text-link: #58A6FF;
  --status-normal: #238636;
  --status-warning: #D29922;
  --status-critical: #DA3633;
  --status-info: #58A6FF;
  --border-default: #30363D;
  --border-muted: #21262D;
}
```

### Light Mode

```css
body.light-mode {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F6F8FA;
  --bg-tertiary: #E5E7EB;
  --bg-hover: #D1D5DB;
  --bg-active: #DBEAFE;
  --text-primary: #24292F;
  --text-secondary: #57606A;
  --text-muted: #8B949E;
  --text-inverse: #FFFFFF;
  --border-default: #D0D7DE;
  --border-muted: #E5E7EB;
  --border-emphasis: #0969DA;
}
```

---

## Theme Toggle Implementation

### Location

`components/Layout/Sidebar.tsx`

### Initialization Logic

```typescript
const [isDarkMode, setIsDarkMode] = useState(() => {
  const saved = localStorage.getItem('THEME_MODE');
  
  // Priority 1: User's explicit saved preference
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    return false;
  }
  if (saved === 'dark') {
    return true;
  }
  
  // Priority 2: OS preference (for first-time visitors)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (!prefersDark) {
    document.body.classList.add('light-mode');
  }
  return prefersDark;
});
```

### Toggle Function

```typescript
const toggleTheme = () => {
  if (isDarkMode) {
    document.body.classList.add('light-mode');
    localStorage.setItem('THEME_MODE', 'light');
    setIsDarkMode(false);
  } else {
    document.body.classList.remove('light-mode');
    localStorage.setItem('THEME_MODE', 'dark');
    setIsDarkMode(true);
  }
  window.dispatchEvent(new Event('theme-change'));
};
```

---

## Chart Theme Hook

### Location

`components/Visualizations/Charts.tsx`

### Implementation

```typescript
const useChartTheme = () => {
  const getTheme = () => {
    const isLight = document.body.classList.contains('light-mode');
    return {
      grid: isLight ? '#E5E7EB' : '#30363D',
      text: isLight ? '#6B7280' : '#8B949E',
      tooltipBg: isLight ? '#FFFFFF' : '#161B22',
      tooltipBorder: isLight ? '#E5E7EB' : '#30363D',
      colors: {
        primary: '#58A6FF',
        warning: '#D29922',
        critical: '#DA3633',
        success: '#238636',
        // ... fuel colors
      }
    };
  };

  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const handleThemeChange = () => setTheme(getTheme());
    window.addEventListener('theme-change', handleThemeChange);
    
    // MutationObserver for body class changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  return theme;
};
```

---

## Usage Guidelines

### ✅ Correct Usage

```tsx
// Use CSS variables for all colors
<div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
  Content
</div>

// Use semantic variable names
<div className="border-[var(--border-default)]">
  Card
</div>
```

### ❌ Incorrect Usage

```tsx
// NEVER hardcode colors
<div className="bg-[#0D1117] text-white">
  This will break in light mode!
</div>

// NEVER use naked Tailwind colors without dark: modifier
<div className="bg-slate-900 text-gray-100">
  This will also break!
</div>
```

### ⚠️ Exceptions

Some contexts intentionally use hardcoded colors:

| Context | Reason |
|---------|--------|
| 3D Map overlays | Must contrast with satellite imagery |
| Print/PDF views | Paper is always white |
| Terminal effects | Intentional dark aesthetic |
| Status indicator dots | Semantic colors (green/yellow/red) |

---

## Testing Theme Changes

1. Open the app
2. Click the **sun/moon toggle** in the sidebar
3. Verify all components change colors:
   - Cards and backgrounds
   - Text and labels
   - Charts and visualizations
   - Input fields
   - Modals and tooltips
4. Reload the page — preference should persist
5. Clear localStorage and reload — should match OS preference

---

## Adding New Components

When creating new components:

1. **Never** use hardcoded hex colors
2. **Always** use `var(--variable-name)` syntax
3. **Check** both light and dark modes before merging
4. **Document** any intentional exceptions

### Template

```tsx
export const NewComponent: React.FC = () => (
  <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg">
    <h2 className="text-[var(--text-primary)]">Title</h2>
    <p className="text-[var(--text-secondary)]">Description</p>
    <button className="bg-[var(--status-info)] text-[var(--text-inverse)]">
      Action
    </button>
  </div>
);
```
