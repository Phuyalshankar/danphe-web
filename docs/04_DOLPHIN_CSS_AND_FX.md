# 🎨 Danphe-Web: डल्फिन सीएसएस र भिजुअल इफेक्ट्स (DolphinCSS & Special FX)

> **पोलिमोर्फिक डिजाइन टोकन • हिमालयन थिमहरू • सगरमाथा वालपेपर • विशेष प्रभावहरू (`fx-crystal`, `fx-neon`, `fx-aurora`)**

---

## १. डल्फिन सीएसएस के हो? (What is DolphinCSS?)

**डल्फिन सीएसएस (DolphinCSS)** डाँफे इकोसिस्टमको लागि विशेष रूपमा तयार पारिएको शून्य-ओभरहेड स्टाइलिस इन्जिन हो। यसमा टेलविन्ड जस्तै क्लासहरू हुन्छन् तर कुनै भारी नोड मोड्युल्स वा जटिल बिल्ड प्रक्रिया बिना तत्काल ब्राउजरमै माइक्रोसेकेन्डमा उत्पन्न हुन्छ।

```javascript
import { generateCoreCSS } from 'danphe-web';

// कोर सीएसएस स्ट्रिङ निकाल्न सकिन्छ
const cssText = generateCoreCSS();
```

---

## २. पोलिमोर्फिक टोकनहरू (Polymorphic Design Tokens)

डल्फिन सीएसएसका क्लासहरू "एलिमेन्ट-अज्ञेय" (Element-Agnostic) हुन्छन्। अर्थात् एउटै क्लास बटन, कार्ड, वा इनपुट जहाँ राखे पनि त्यसले स्वचालित रूपमा सुन्दर रूप लिन्छ:

* `card glass`: पारदर्शी फ्रोस्टेड ग्लास पृष्ठभूमि
* `card outlined`: सूक्ष्म बोर्डर भएको सफा कार्ड
* `filled`: ठोस प्रिमियम पृष्ठभूमि
* `glow`: बाहिरी प्रकाशयुक्त आभा

```jsx
<div className="card glass glow p-5">
  <button className="filled fx-neon md">सक्रिय</button>
</div>
```

---

## ३. हिमालयन कलर प्यालेट (Himalayan Color Palette)

नेपालका हिमशिखरहरूबाट प्रेरित अद्वितीय रंग प्यालेटहरू:

| क्लास (Class) | विवरण / रंग (Description) |
|---|---|
| `bg-everest` | सगरमाथाको आधार शिविरको गहिरो आकाशे निलो (`#0f172a` / `#0284c7`) |
| `bg-lhotse` | ल्होत्से हिमालको हिउँजस्तो चम्किलो सेतो र चाँदी रंग |
| `bg-machhapuchhre` | माछापुच्छ्रेको सौम्य गोधूली बैजनी रंग (`#6366f1`) |
| `bg-makalu` | मकालुको गाढा चट्टानी स्लेट रंग (`#1e293b`) |
| `text-danphe-red` | डाँफेको रातो प्वाँख रंग (`#dc2626`) |
| `text-danphe-emerald`| डाँफेको चम्किलो हरियो प्वाँख रंग (`#10b981`) |

---

## ४. विशेष प्रभावहरू (Special Visual Effects - FX)

कुनै जटिल CSS कोड नलेखी केवल एउटा क्लास थपेर प्रिमियम ग्लासमोर्फिजम तथा नियोन इफेक्ट पाउन सकिन्छ:

### क. क्रिस्टल ग्लास (`fx-crystal`):
अल्ट्रा-क्लियर फ्रोस्टेड ग्लास इफेक्ट, सफ्ट ब्याकड्रप ब्लर र सूक्ष्म बोर्डर ग्लो।
```jsx
<div className="card glass fx-crystal p-6 rounded-2xl">
  <h2 className="text-white font-bold">क्रिस्टल कार्ड</h2>
  <p className="text-slate-300 text-sm">पृष्ठभूमिको रंग र प्रकाश आरपार देखिन्छ।</p>
</div>
```

### ख. साइबर नियोन (`fx-neon`):
सक्रिय स्थिति र हार्डवेयर बटनहरूका लागि जीवन्त नियोन आभा।
```jsx
<button className="filled fx-neon px-5 py-2.5 rounded-xl font-bold">
  सिस्टम सक्रिय गर्नुहोस्
</button>
```

### ग. नर्दन अरोरा (`fx-aurora`):
लगातार गतिशील रङहरूको लहर उत्पन्न गर्ने मनमोहक एनिमेटेड पृष्ठभूमि।
```jsx
<div className="fx-aurora p-8 rounded-3xl text-white">
  <h1>अरोरा डिस्प्ले ब्यानर</h1>
</div>
```

---

## ५. सगरमाथा फोटो वालपेपर (Everest Photo Wallpaper)

डाँफे-वेबमा सगरमाथाको वास्तविक हिमाल फोटो पृष्ठभूमि एकीकृत गरिएको छ:

```jsx
// सगरमाथा फोटो पृष्ठभूमि सक्रिय गर्न:
<div className="min-h-screen bg-everest-photo">
  {/* फ्रोस्टेड ग्लास कार्डहरू यसको माथि मनमोहक देखिन्छन् */}
</div>
```

---

## ६. डार्क / लाइट मोड स्विच (Dark & Light Mode Integration)

डल्फिन सीएसएसले सिस्टम प्राथमिकता अनुसार स्वतः अनुकूलन गर्छ वा सिधै बदल्न सकिन्छ:

```jsx
export function ThemeToggle({ theme }) {
  const toggle = () => {
    theme.mode = theme.mode === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme.mode);
  };

  return (
    <button onClick={toggle} className="card outlined p-2 text-xs">
      थिम बदल्नुहोस्: {theme.mode || 'dark'}
    </button>
  );
}
```
