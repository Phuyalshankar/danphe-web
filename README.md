# 🇳🇵 Danphe-Web (`danphe-web`)
> **The Post-Virtual-DOM Reactive Web Framework & Hardware-Grade Serial Communicator**  
> *Zero React Overhead • Zero Hooks Hell • Direct Real-DOM Pointers • < 6 KB Gzipped • Single Multi-Platform Codebase*

---

## ⚡ Git बाट सिधै इन्स्टल गर्नुहोस् (Installation via Git)

डाँफे-वेबलाई npm रजिस्ट्रीको पर्खाइ बिना सिधै GitHub बाट इन्स्टल गर्न सकिन्छ:

### १. विश्वव्यापी कमान्ड लाइन (Global CLI) इन्स्टल गर्न:
```bash
npm install -g git+https://github.com/Phuyalshankar/danphe-web.git
```
*(यसले तपाईंको टर्मिनलमा `danphe` र `dolphin` कमान्डहरू उपलब्ध गराउँछ।)*

### २. कुनै प्रोजेक्टमा डिपेन्डेन्सीको रूपमा जोड्न:
```bash
npm install git+https://github.com/Phuyalshankar/danphe-web.git
```

### ३. नयाँ प्रोजेक्ट सुरु गर्न (Quickstart):
```bash
# नयाँ पूर्ण प्रोजेक्ट संरचना सिर्जना गर्नुहोस् (Danphe-Native ढाँचा)
danphe init my-danphe-app

# प्रोजेक्ट फोल्डरमा जानुहोस्
cd my-danphe-app

# विकास सर्भर सुरु गर्नुहोस्
danphe dev
```

---

## 📚 विस्तृत ट्युटोरियल गाइडहरू (Documentation & Tutorials)

फ्रेमवर्कका प्रत्येक पाटोलाई गहन रूपमा बुझ्नको लागि तयार पारिएका ट्युटोरियल गाइडहरू `docs/` फोल्डरमा उपलब्ध छन्:

1. 📖 **[०१. सुरुवाती गाइड (Getting Started Guide)](docs/01_GETTING_STARTED.md)**  
   *इन्स्टलेसन, नयाँ प्रोजेक्ट सिर्जना, फोल्डर संरचना, र पहिलो कम्पोनेन्ट।*
2. 🧩 **[०२. JSX र कम्पोनेन्ट वास्तुकला (JSX & Components Guide)](docs/02_JSX_AND_COMPONENTS.md)**  
   *शून्य भर्चुअल DOM, प्रत्यक्ष DOM पोइन्टर, नेस्टेड र डटेड ट्यागहरू (`<Everest.Card />`), र देवनागरी युनिकोड समर्थन।*
3. ⚡ **[०३. रियाक्टिभ बस र कम्युनिकेटर सर्भर (Reactive Bus & Communicator)](docs/03_REACTIVE_BUS_AND_COMMUNICATOR.md)**  
   *टाइटन कम्युनिकेटर (`TitanCommunicatorServer`), शून्य-CORS, `/bus/stream` SSE, १६-बिट रजिस्टर प्रोटोकल, र हार्डवेयर सिरियल ब्रिज।*
4. 🎨 **[०४. डल्फिन सीएसएस र भिजुअल इफेक्ट्स (DolphinCSS & Special FX)](docs/04_DOLPHIN_CSS_AND_FX.md)**  
   *शून्य-रनटाइम पोलिमोर्फिक टोकनहरू, हिमालयन थिमहरू (`bg-everest`, `bg-lhotse`), र क्रिस्टल ग्लास इफेक्ट्स (`fx-crystal`, `fx-neon`, `fx-aurora`)।*
5. 📱 **[०५. बहु-प्लेटफर्म र नेटिभ वास्तुकला (Multi-Platform Native Guide)](docs/05_MULTI_PLATFORM_NATIVE.md)**  
   *एकल JSX कोडबेसबाट वेब, एन्ड्रोइड २४-बाइट बाइनरी (`.dolp`), र इम्बेडेड C++ / LVGL (ESP32/STM32) मा स्वतः कम्पाइलेसन।*

---

## 🏗️ मानक प्रोजेक्ट संरचना (Clean Danphe-Web Scaffold)

`danphe init <app-name>` कमान्डले सिर्जना गर्ने आधुनिक र सफा वास्तुकला (Zero Circuits, Zero Hardware Registers Bloat):

```
my-danphe-app/
├── components/          # पुन: प्रयोगयोग्य युआई कम्पोनेन्टहरू (Cards, Buttons, Nav)
├── pages/               # मुख्य स्क्रिनहरू (HomePage.jsx, SettingsPage.jsx)
├── assets/              # आइकन, फोटो तथा स्थिर फाइलहरू (everest.png, icons/)
├── app.jsx              # मुख्य एकल साझा दृश्य (Master Registers & Carrier Slots)
├── app.logic.js         # सिरियल एक्सन र बिजनेस लजिक ({ rx, tx })
├── index.html           # वेब ब्राउजर प्रवेशद्वार
├── dolphin.config.js    # मोबाइल, नेटिभ तथा वेब बिल्ड कन्फिगरेसन
└── package.json         # डिपेंडेन्सी र कमान्डहरू
```

---

## 🚀 मुख्य विशेषताहरू (Key Highlights)

- **Zero React Overhead:** कुनै `useState`, `useEffect`, वा स्टेल क्लोजर (Stale Closures) को झन्झट छैन।
- **Direct Real-DOM Mutations:** भर्चुअल DOM डिफिङ बिना `< 1 µs` भित्र सिधै वास्तविक DOM नोड अद्यावधिक हुन्छ।
- **Ultra Lightweight:** पूर्ण क्लाइन्ट रनटाइम बन्डल केवल **~५-६ KB (gzipped)** (रियाक्ट भन्दा २५ गुणा हल्का)।
- **Enterprise-Grade Security:** १ एमबी बडी सुरक्षा, SSRF क्लाउड मेटाडाटा ब्लक, र रिसोर्स लिक रोक्न १०,००० रजिस्टर क्याप।
- **Hardware-First Communicator:** भौतिक सिरियल पोर्ट, टिसीपी रिले, र वेब ब्राउजर बीच सिधै सिङ्क।

---

## 📦 ब्राउजरमा बिना बिल्ड चलाउन (Zero-Build CDN / Script Tag)

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

    // १-लाइन रियाक्टिभ स्टेट
    const form = reg('form:: name, email');

    function App() {
      return h('div', { class: 'filled primary md glow motion' },
        h('h2', {}, 'नमस्ते डाँफे-वेब! 🦚'),
        h('input', { class: 'filled neutral md', rx: 'form::name', placeholder: 'तपाईंको नाम' }),
        h('div', {}, () => `लाइभ नाम: ${form.name}`)
      );
    }

    render(h(App), '#app');
  </script>
</body>
</html>
```

---

## 🧪 टेस्ट र गुणस्तर प्रमाणीकरण (Testing & Verification)

डाँफे-वेबमा १०६+ स्वचालित युनिट र इन्टिग्रेसन टेस्टहरू समावेश छन्:

```bash
# सबै टेस्टहरू चलाउन:
node tests/run_all.js
node tests/test_communicator_server.js
node tests/test_modular_lexer_parser.js
node tests/test_titan_tcp_relay.js
```

---

## 📄 लाइसेन्स (License)
MIT © [Shankar Phuyal](https://github.com/Phuyalshankar) / Danphe Sovereign Ecosystem.
