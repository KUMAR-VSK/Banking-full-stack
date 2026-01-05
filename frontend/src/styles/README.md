# Styles Directory

This directory contains additional CSS files for component-specific styles.

## Files

- **components.css**: Reusable component utility classes (buttons, forms, badges, alerts, etc.)

## Usage

Import in your component if you need specific utility classes:

```jsx
import '../styles/components.css';

function MyComponent() {
  return (
    <button className="btn btn-primary">
      Click me
    </button>
  );
}
```

Most styles are already available globally through `index.css`. Only import `components.css` if you need the additional utility classes defined here.

