# CSS Organization Guide

This document explains how CSS is organized in this project using Tailwind CSS.

## 📁 File Structure

```
frontend/src/
├── index.css              # Main CSS file with Tailwind directives and component classes
├── styles/
│   └── components.css     # Additional component-specific utility classes
└── tailwind.config.js     # Tailwind configuration with custom theme
```

## 🎨 CSS Architecture

### 1. **index.css** - Main Stylesheet

This file is organized into clear sections:

#### Tailwind Directives
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### Base Styles (`@layer base`)
- Global resets
- Body and typography defaults
- Form element defaults

#### Component Classes (`@layer components`)
All reusable component classes using Tailwind's `@apply` directive:
- Dashboard components (`.dashboard-container`, `.dashboard-header`, etc.)
- Card components (`.card`)
- Form components (`.form-group`, `.document-select`, etc.)
- Table components (`.table-container`, `.documents-table`)
- Status badges (`.status`)
- Loading states (`.loading`, `.loading-spinner`)
- Progress indicators (`.progress-bar`, `.progress-item`)

#### Utility Classes (`@layer utilities`)
- Custom animations (`@keyframes fadeIn`, `slideIn`)
- Scrollbar styling (`.custom-scrollbar`)
- Glass morphism effects (`.glass`)
- Gradient text (`.gradient-text`)

#### Responsive Utilities
Media queries for mobile-first responsive design

#### Dark Mode Support
Styles for dark mode when enabled

### 2. **styles/components.css** - Component Utilities

Additional utility classes for common components:
- Button variants (`.btn-primary`, `.btn-secondary`, etc.)
- Form components (`.form-input`, `.form-label`, etc.)
- Badge components (`.badge`, `.badge-success`, etc.)
- Alert components (`.alert-success`, `.alert-error`, etc.)
- Modal components (`.modal-overlay`, `.modal-content`)
- Loading spinners (`.spinner-sm`, `.spinner-md`, `.spinner-lg`)

### 3. **tailwind.config.js** - Configuration

Custom theme extensions:
- **Colors**: Primary, success, danger, warning color palettes
- **Fonts**: Inter font family
- **Spacing**: Custom spacing values
- **Shadows**: Soft shadows and glow effects
- **Animations**: Custom keyframes and animations
- **Transitions**: Custom transition durations

## 🚀 Usage Examples

### Using Component Classes

```jsx
// Dashboard container
<div className="dashboard-container">
  <div className="dashboard-header">
    <div className="header-content">
      {/* ... */}
    </div>
  </div>
</div>

// Card component
<div className="card">
  <h3>Card Title</h3>
  {/* ... */}
</div>

// Status badge
<span className="status status-approved">APPROVED</span>
```

### Using Tailwind Utility Classes Directly

```jsx
// Direct Tailwind utilities
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-lg">
  <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
    Click me
  </button>
</div>
```

### Using Component Utilities from components.css

```jsx
// Button variants
<button className="btn btn-primary">Primary Button</button>
<button className="btn btn-success">Success Button</button>

// Form inputs
<input className="form-input" />
<input className="form-input form-input-error" />

// Badges
<span className="badge badge-success">Success</span>
<span className="badge badge-danger">Error</span>
```

## 🎯 Best Practices

### 1. **Prefer Component Classes for Repeated Patterns**
If you're using the same combination of Tailwind classes multiple times, create a component class:

```css
/* In index.css */
.my-custom-button {
  @apply px-6 py-3 bg-primary-600 text-white rounded-lg 
         hover:bg-primary-700 transition-all;
}
```

### 2. **Use Utility Classes for One-off Styles**
For unique styles that won't be reused, use Tailwind utilities directly:

```jsx
<div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8">
  {/* Unique gradient background */}
</div>
```

### 3. **Organize by Component**
Group related styles together in the CSS file. For example, all dashboard-related classes are in one section.

### 4. **Use Semantic Class Names**
Choose class names that describe what the element is, not how it looks:
- ✅ `.dashboard-header` (semantic)
- ❌ `.blue-gradient-box` (presentational)

### 5. **Leverage Tailwind's Responsive Utilities**
Use Tailwind's responsive prefixes instead of media queries when possible:

```jsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
```

## 🔧 Customization

### Adding New Colors

Edit `tailwind.config.js`:

```js
colors: {
  primary: { /* ... */ },
  custom: {
    500: '#your-color',
    600: '#darker-shade',
  }
}
```

### Adding New Component Classes

Add to `index.css` in the `@layer components` section:

```css
@layer components {
  .my-new-component {
    @apply /* your Tailwind classes */;
  }
}
```

### Adding Custom Animations

Add to `tailwind.config.js`:

```js
keyframes: {
  myAnimation: {
    '0%': { /* ... */ },
    '100%': { /* ... */ },
  }
},
animation: {
  'my-animation': 'myAnimation 0.5s ease-out',
}
```

## 📱 Responsive Design

The project uses a mobile-first approach. Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Example:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

## 🌙 Dark Mode

Dark mode styles are included in `index.css`. To enable dark mode, add the `dark-mode` class to the body:

```jsx
document.body.className = 'dark-mode';
```

## 📚 Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Components](https://tailwindui.com/components)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

