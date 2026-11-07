# 🇳🇵 Danphe-Web (`danphe-web`)
> **The Post-Virtual-DOM Reactive Web Framework with Built-in Polymorphic Design Tokens**  
> *Zero React Overhead • Zero Hooks Hell • Deterministic Carrier Slots • < 10 KB Footprint*

---

## 🚀 Why Danphe-Web?

Modern web development with React is bloated:
- **150+ KB bundle sizes** just for basic DOM rendering.
- **Hooks Hell:** `useState`, `useEffect`, stale closures, infinite re-render loops, and `useCallback` boilerplate.
- **Virtual DOM diffing latency:** Diffing 10,000 nodes on every keystroke.
- **Tailwind string soup:** 20 class names per element.

**Danphe-Web solves all of this with 5 clean micro-modules:**

1. **Zero-Virtual-DOM JSX Runtime (`jsx-runtime`):** Direct pointer mutations to real DOM in `< 1 µs`.
2. **Deterministic Carrier Store (`store`):** One-line form and state handling: `reg('form:: name, email, password')`. Zero `useState`, zero `onChange`.
3. **Polymorphic DolphinCSS (`dolphincss`):** 10-12 element-agnostic tokens (`filled primary md glow motion`). The same class styles buttons, cards, divs, and inputs automatically.
4. **Instant Client Router (`router`):** Zero-reload hash & HTML5 history routing with route parameters.
5. **Titan-Bus Transport (`transport`):** Native bridge for 6-byte Micro-SISO (`0x5349`) and WebSocket streams from Dolphin-CPP or Node.js.

---

## 📦 Quickstart

### 1. Zero-Build Script Include (Browser)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/danphe-web/dist/danphe-web.standalone.js"></script>
</head>
<body>
  <div id="app"></div>

  <script>
    const { h, render, reg } = window.DanpheWeb;

    // 1-line form declaration!
    const form = reg('form:: name, email, password');

    function App() {
      return h('card', { class: 'filled primary md glow motion' },
        h('h2', {}, 'Hello Danphe-Web!'),
        h('input', { class: 'filled neutral md', rx: 'form::name', placeholder: 'Your Name' }),
        h('div', {}, () => `Live Name: ${form.name}`)
      );
    }

    render(h(App), '#app');
  </script>
</body>
</html>
```

### 2. NPM / Node.js

```bash
npm install danphe-web
```

```javascript
import { h, render, reg, router } from 'danphe-web';

const user = reg('user:: name, email, role');
```

---

## 🧩 Architectural Modules

```
D:\danphe-web/
├── src/
│   ├── core/
│   │   ├── jsx-runtime.js   # Hyperscript h(), createElement, direct pointer render
│   │   ├── store.js         # Reactive carrier slots (reg, proxy, zero hooks)
│   │   ├── router.js        # Universal client routing (hash/history)
│   │   ├── dolphincss.js    # Polymorphic design tokens engine
│   │   └── transport.js     # Titan-Bus / SISO WebSocket gateway
│   ├── index.js             # Unified CommonJS entrypoint
│   └── index.mjs            # Unified ESM entrypoint
├── dist/
│   └── danphe-web.standalone.js # Standalone < 10 KB bundle
├── examples/
│   └── index.html           # Live zero-boilerplate demo
├── tests/
│   └── run_all.js           # Automated test suite
└── package.json
```

---

## 📄 License
MIT © Shankar Phuyal / Danphe Sovereign Ecosystem.
