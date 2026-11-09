# 🏔️ Danphe-Web: आधिकारिक सुरुवाती गाइड (Getting Started Guide)

> **डाँफे-वेब (Danphe-Web):** शून्य-भर्चुअल DOM (Zero-VDOM), मोड्युलर लेक्सर र पार्सर कम्पाइलर, क्यारियर स्लट भेरिएबल एलोकेसन, र हार्डवेयर-ग्रेड सिरियल कम्युनिकेटर फ्रेमवर्क।

---

## १. वास्तुकलाको परिचय (Architecture Philosophy)

डाँफे-वेब आधुनिक वेब तथा हार्डवेयर सञ्चारको लागि तयार पारिएको विश्वस्तरीय माइक्रो-फ्रेमवर्क हो। यसका मूल आधारहरू:
1. **शून्य भर्चुअल DOM (Zero-VDOM):** कुनै भर्चुअल ट्री र डिफिङ ओभरहेड छैन। स्टेट परिवर्तन हुँदा वास्तविक DOM सिधै **१ माइक्रोसेकेन्ड भन्दा कम समयमा** अद्यावधिक हुन्छ।
2. **क्यारियर स्लट भेरिएबल एलोकेसन (Carrier Slots):** `reg user:: name, email, submit, status;` घोषणा गर्दा कम्पाइलरले बेस रजिस्टर र स्लट १, २, ३ स्वतः एलोकेट गर्छ। सिस्टम चर (०-९९) बाहेक सबै एप चरहरू अनिवार्य नेमस्पेस भित्र बाँधिन्छन्।
3. **शून्य-फेच सिरियल कम्युनिकेटर (Zero-Fetch Serial Bus):** क्लाइन्टमा कुनै `fetch()` वा `axios` हुँदैन। बटनमा `tx={user.submit}` लेख्दा एक्सन सर्भरमा पुग्छ र सर्भरले प्रक्रिया पूरा गरी बस स्ट्रिम (`/bus/stream`) मार्फत स्क्रिनलाई तत्काल अद्यावधिक गराउँछ।

---

## २. Git बाट सिधै इन्स्टल गर्नुहोस् (Installation via Git)

डाँफे-वेबलाई npm रजिस्ट्रीको पर्खाइ नगरी सिधै आधिकारिक रिपोजिटरीबाट इन्स्टल गर्न सकिन्छ:

### क. कमान्ड लाइन टूल (Global CLI) इन्स्टल गर्न:
```bash
npm install -g git+https://github.com/Phuyalshankar/danphe-web.git
```
*(यसले तपाईंको टर्मिनलमा `danphe` र `dolphin` कमान्डहरू विश्वव्यापी रूपमा उपलब्ध गराउँछ।)*

### ख. कुनै प्रोजेक्टमा डिपेन्डेन्सीको रूपमा जोड्न:
```bash
npm install git+https://github.com/Phuyalshankar/danphe-web.git
```

---

## ३. नयाँ प्रोजेक्ट सिर्जना गर्नुहोस् (Create New Project)

नयाँ डाँफे-वेब प्रोजेक्ट बनाउन निम्न कमान्ड चलाउनुहोस्:

```bash
danphe init my-danphe-app
cd my-danphe-app
```

यसले कुनै अनावश्यक बाह्य हार्डवेयर सर्किट बिना शुद्ध, सफा र पूर्ण प्रोजेक्ट संरचना तयार गर्छ:

```
my-danphe-app/
├── components/          # पुन: प्रयोगयोग्य युआई कम्पोनेन्टहरू (Cards, Buttons, Nav)
├── pages/               # मुख्य स्क्रिनहरू (HomePage.jsx, SettingsPage.jsx)
├── assets/              # आइकन, फोटो तथा वालपेपरहरू
├── app.jsx              # मुख्य एकल साझा दृश्य (Master Registers & Carrier Slots)
├── app.logic.js         # सिरियल एक्सन र बिजनेस लजिक ({ rx, tx })
├── index.html           # वेब ब्राउजर प्रवेशद्वार
├── dolphin.config.js    # मोबाइल, नेटिभ तथा वेब बिल्ड कन्फिगरेसन
└── package.json         # डिपेंडेन्सी र कमान्डहरू
```

---

## ४. विकास सर्भर सुरु गर्नुहोस् (Run Dev Server)

```bash
danphe dev
```

सर्भर सुरु भएपछि:
* 🌐 **वेब एप पूर्वावलोकन (Web App Preview):** `http://localhost:7080`
* ⚡ **सिरियल कम्युनिकेटर रिले:** `http://localhost:7081` (TCP) / `/bus/stream` (SSE)

---

## ५. प्रमाणित फारम र क्यारियर स्लट उदाहरण (Verified Form Submission)

`app.jsx` मा कोड कसरी लेखिन्छ हेर्नुहोस् (यो कोड `tests/test_form_submission_e2e.js` द्वारा १००% प्रमाणित छ):

```jsx
import { h, reg } from 'danphe-web';

// १. मुख्य बेस रजिस्टर र स्लट भेरिएबल एलोकेसन (Lexer & Parser द्वारा संकलित)
//    - user.name     ➔ Base Register + Slot 1
//    - user.email    ➔ Base Register + Slot 2
//    - user.password ➔ Base Register + Slot 3
//    - user.submit   ➔ Base Register + Slot 4 (सबमिट एक्सन ट्रिगर)
//    - user.status   ➔ Base Register + Slot 5 (प्रतिक्रिया स्लट)
export const user = reg('user:: name, email, password, submit, status');

export default function App() {
  return (
    <div className="card glass p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-black text-white">
        प्रयोगकर्ता दर्ता फारम 🦚
      </h1>
      <p className="text-xs text-slate-400">
        Deterministic Carrier Slots • Zero-VDOM • Zero-Fetch Architecture
      </p>

      {/* २. भेरिएबल टू-वे बाइन्डिङ: rx={user.name} (Zero onChange, Zero useState) */}
      <div className="space-y-3">
        <input 
          name="name" 
          rx={user.name} 
          placeholder="तपाईंको नाम (Slot 1)" 
          className="w-full card outlined p-3 text-white" 
        />

        <input 
          name="email" 
          rx={user.email} 
          placeholder="तपाईंको इमेल (Slot 2)" 
          className="w-full card outlined p-3 text-white" 
        />

        <input 
          name="password" 
          type="password"
          rx={user.password} 
          placeholder="पासवर्ड (Slot 3)" 
          className="w-full card outlined p-3 text-white" 
        />

        {/* ३. बटन ट्रान्समिट: tx={user.submit} ले कुनै fetch नगरी सर्भरमा 'user::submit' एक्सन पठाउँछ */}
        <button 
          tx={user.submit} 
          className="filled fx-neon md glow cursor-pointer w-full py-3"
        >
          <span>🚀 दर्ता सुरक्षित गर्नुहोस् (TX)</span>
        </button>
      </div>

      {/* ४. सर्भरको जवाफ देखाउने प्रत्यक्ष DOM पोइन्टर */}
      <div className="p-3 card outlined text-xs font-bold text-emerald-400">
        स्थिति: <span rx={user.status}>फारम भर्न तयार</span>
      </div>
    </div>
  );
}
```

---

## ६. सर्भर लजिक कसरी चल्छ? (`app.logic.js`)

ब्राउजरबाट `tx={user.submit}` थिचिँदा सर्भरको `app.logic.js` ले यसरी प्रोसेस गर्छ:

```javascript
// app.logic.js
module.exports = {
  // जब बटनबाट 'user::submit' एक्सन ट्रिगर हुन्छ:
  'user::submit': ({ rx, tx }) => {
    // १. स्लट मेमोरीबाट डाटा पढ्ने:
    const name = rx('user::name');
    const email = rx('user::email');
    const pass = rx('user::password');

    console.log(`📡 [Communicator] सबमिट डाटा प्राप्त: ${name} (${email})`);

    // २. प्रमाणीकरण र सर्भर जाँच:
    if (!name || !email) {
      tx('user::status', '⚠️ त्रुटि: नाम र इमेल अनिवार्य छन्!');
      return;
    }

    if (pass.length < 6) {
      tx('user::status', '⚠️ त्रुटि: पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ!');
      return;
    }

    // ३. आउटपुट स्लटमा मान लेख्ने (जुन क्लाइन्टमा स्वतः जान्छ):
    tx('user::status', `✅ बधाई छ ${name}, तपाईंको दर्ता सफल भयो!`);
  }
};
```
