'use strict';

/**
 * 🐬 DANPHE-WEB JSX RUNTIME (v1.0.0)
 * Ultra-Lean, Zero-Virtual-DOM Direct DOM Engine (< 4 KB)
 * 
 * • 0% React overhead / 0% Virtual DOM diffing tree
 * • Direct Pointer DOM Updates (O(1) microsecond mutation)
 * • Hyperscript Factory h() + Tagged Template html``
 * • Native Support for Polymorphic DolphinCSS Tokens
 */

/**
 * Hyperscript Factory h(tag, props, ...children)
 */
function h(tag, props, ...children) {
  props = props || {};
  const flatChildren = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      flatChildren.push(...child.flat(Infinity));
    } else if (child !== null && child !== undefined && child !== false) {
      flatChildren.push(child);
    }
  }

  if (typeof tag === 'function') {
    return tag({ ...props, children: flatChildren });
  }

  return {
    __isDanpheVNode: true,
    tag: typeof tag === 'string' ? tag.toLowerCase() : tag,
    props,
    children: flatChildren
  };
}

/**
 * Tagged Template Literal: html`<div>...</div>`
 */
function html(strings, ...values) {
  let raw = '';
  const valMap = new Map();
  strings.forEach((str, i) => {
    raw += str;
    if (i < values.length) {
      const token = `__DANPHE_VAL_${i}__`;
      valMap.set(token, values[i]);
      raw += token;
    }
  });

  if (typeof document === 'undefined') {
    return { raw, valMap };
  }

  const template = document.createElement('template');
  template.innerHTML = raw.trim();
  return _domToVNode(template.content.firstChild, valMap);
}

function _domToVNode(node, valMap) {
  if (!node) return null;
  if (node.nodeType === 3) { // TEXT_NODE
    let text = node.textContent;
    for (const [token, val] of valMap.entries()) {
      if (text.includes(token)) return val;
    }
    return text;
  }
  if (node.nodeType !== 1) return null; // ELEMENT_NODE

  const tag = node.tagName.toLowerCase();
  const props = {};
  for (const attr of Array.from(node.attributes)) {
    let val = attr.value;
    for (const [token, actualVal] of valMap.entries()) {
      if (val === token) { val = actualVal; break; }
    }
    props[attr.name] = val;
  }

  const children = [];
  for (const child of Array.from(node.childNodes)) {
    const vchild = _domToVNode(child, valMap);
    if (vchild !== null && vchild !== undefined) children.push(vchild);
  }

  return h(tag, props, ...children);
}

/**
 * Creates Real DOM from VNode and wires direct pointer reactivity
 */
function createElement(vnode, store = null) {
  if (vnode === null || vnode === undefined || vnode === false) {
    return document.createTextNode('');
  }

  // Primitive strings/numbers
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(String(vnode));
  }

  // Function / Getter returning dynamic value
  if (typeof vnode === 'function') {
    const textNode = document.createTextNode('');
    const update = () => {
      textNode.textContent = String(vnode() ?? '');
    };
    update();
    if (store && typeof store.subscribe === 'function') {
      const unsub = store.subscribe('*', update);
      textNode.__danphe_cleanup = unsub;
    }
    return textNode;
  }

  // Handle Components
  if (typeof vnode.tag === 'function') {
    return createElement(vnode.tag({ ...vnode.props, children: vnode.children }), store);
  }

  const el = document.createElement(vnode.tag || 'div');
  const cleanups = [];

  // Bind Props & Attributes
  if (vnode.props) {
    for (const [key, val] of Object.entries(vnode.props)) {
      if (key === 'children') continue;

      // Event Listeners: onClick, onInput, onSubmit, etc.
      if (key.startsWith('on') && typeof val === 'function') {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, val);
        cleanups.push(() => el.removeEventListener(eventName, val));
        continue;
      }

      // Two-Way Binding: name="..." inside a form namespace
      if (key === 'bind' || key === 'rx') {
        if (store && typeof store.bindInput === 'function') {
          const unsub = store.bindInput(el, val);
          if (unsub) cleanups.push(unsub);
        }
        continue;
      }

      // Slot Binding: slot="4"
      if (key === 'slot') {
        el.setAttribute('data-danphe-slot', String(val));
        if (store && typeof store.bindSlotElement === 'function') {
          const unsub = store.bindSlotElement(el, val, vnode.props.namespace);
          if (unsub) cleanups.push(unsub);
        }
      }

      // Class or className
      if (key === 'class' || key === 'className') {
        el.className = typeof val === 'function' ? val() : String(val);
        continue;
      }

      // Style object or string
      if (key === 'style') {
        if (typeof val === 'object' && val !== null) {
          Object.assign(el.style, val);
        } else {
          el.setAttribute('style', String(val));
        }
        continue;
      }

      // Regular attributes
      if (typeof val === 'boolean') {
        if (val) el.setAttribute(key, '');
        else el.removeAttribute(key);
      } else if (val !== null && val !== undefined) {
        el.setAttribute(key, String(val));
      }
    }
  }

  // Append Children
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      el.appendChild(createElement(child, store));
    }
  }

  if (cleanups.length > 0) {
    el.__danphe_cleanups = cleanups;
  }

  return el;
}

/**
 * Mounts VNode tree into container
 */
function render(vnode, container, store = null) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return null;

  unmount(container);
  const dom = createElement(vnode, store);
  container.appendChild(dom);
  return dom;
}

/**
 * Unmounts and runs all cleanups
 */
function unmount(container) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return;

  function cleanupDeep(node) {
    if (!node) return;
    if (Array.isArray(node.__danphe_cleanups)) {
      node.__danphe_cleanups.forEach(fn => { try { fn(); } catch(e) {} });
      node.__danphe_cleanups = null;
    }
    if (node.__danphe_cleanup) {
      try { node.__danphe_cleanup(); } catch(e) {}
      node.__danphe_cleanup = null;
    }
    if (node.childNodes) {
      Array.from(node.childNodes).forEach(cleanupDeep);
    }
  }

  cleanupDeep(container);
  container.innerHTML = '';
}

module.exports = {
  h,
  html,
  createElement,
  render,
  unmount
};
