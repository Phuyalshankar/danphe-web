# 🧩 Danphe-Web: लेक्सर, पार्सर र क्यारियर स्लट वास्तुकला (Lexer, Parser & Carrier Slots)

> **मोड्युलर लेक्सर र पार्सर • अनिवार्य नेमस्पेस थिति • क्यारियर स्लट भेरिएबल एलोकेसन • प्रत्यक्ष DOM पोइन्टर • देवनागरी युनिकोड समर्थन**

---

## १. लेक्सर र पार्सर इन्जिन (Lexer & Parser Architecture)

डाँफे-वेबमा कुनै तदर्थ (Ad-hoc) रेगुलर एक्सप्रेसन प्रयोग हुँदैन। यसमा पूर्ण कम्पाइलर ग्रेडको लेक्सर र पार्सर छ:

```
स्रोत कोड (JSX/JS) 
   │
   ▼
┌───────────────────────────────┐
│        DanpheLexer.js         │  O(N) स्ट्रिमिङ क्यारेक्टर स्क्यानर
│  - KEYWORD: 'reg', 'register' │
│  - COLONCOLON: '::'           │
│  - IDENTIFIERS, STRINGS, TAGS │
└──────────────┬────────────────┘
               │ Tokens Stream
               ▼
┌───────────────────────────────┐
│        DanpheParser.js        │  रिकर्सिभ डिसेन्ट पार्सर (Recursive Descent)
│  - parseRegisterDeclaration() │
│  - parseJSXElement()          │
└──────────────┬────────────────┘
               │ Abstract Syntax Tree (AST)
               ▼
┌───────────────────────────────┐
│     DanpheCodeGenerator.js    │  बहु-लक्ष्य कोड उत्पादन
│  - Web JS (h() Factory)       │
│  - FormRegister / Proxy Wire  │
└───────────────────────────────┘
```

---

## २. डाँफेको कडा थिति: अनिवार्य नेमस्पेस (Strict Namespace Law)

डाँफेको मेमोरी वास्तुकलामा **दुईवटा मात्र स्पष्ट नियमहरू** छन्:

1. **सिस्टम चरहरू (System Variables - 0 to 99):**  
   `SYS_POWER` (1), `SYS_HEARTBEAT` (2), `SYS_AUTH_TOKEN` (3), `SYS_ROUTE` (10), `ERROR_MASTER` (90) आदि। यी सिधै टाइटन कोरका संरक्षित हार्डवेयर ठेगाना हुन्।
2. **एप चरहरू (Application Variables):**  
   सिस्टम चर बाहेक **सबै भेरिएबल अनिवार्य रूपमा प्रत्यक्ष नेमस्पेस (`::`) भित्रै परिभाषित हुनुपर्छ।**

[DanpheParser.js](file:///d:/danphe-web/src/parser/DanpheParser.js) ले नै यो नियम कडाइका साथ लागू गर्दछ:

```javascript
// DanpheParser.js
parseRegisterDeclaration() {
  this.next(); // 'reg'
  const nameToken = this.expect(TokenType.IDENTIFIER); // 1. Namespace Name
  const formId = nameToken.value;

  this.expect(TokenType.COLONCOLON); // 2. अनिवार्य '::' अपरेटर हुनैपर्छ!
```

---

## ३. भेरिएबल र क्यारियर स्लट एलोकेसन (Carrier Slots Allocation)

जब हामी १ लाइनमा स्टेट घोषणा गर्छौँ:

```javascript
export const user = reg('user:: name, email, password, submit, status');
```

कम्पाइलर र स्टोर इन्जिनले निम्न कार्य गर्दछ:
1. `user` नेमस्पेसलाई एउटा सुरक्षित **Base Register** ठेगाना दिन्छ।
2. फिल्डहरूलाई क्रमैसँग **८-बिट क्यारियर स्लटहरू (Slot 1..255)** मा एलोकेट गर्छ:
   * `user.name`     ➔ Base Register + **Slot 1** (`{ reg: 0x0300, slot: 1, name: 'name' }`)
   * `user.email`    ➔ Base Register + **Slot 2** (`{ reg: 0x0300, slot: 2, name: 'email' }`)
   * `user.password` ➔ Base Register + **Slot 3** (`{ reg: 0x0300, slot: 3, name: 'password' }`)
   * `user.submit`   ➔ Base Register + **Slot 4** (सबमिट एक्सन ट्रिगर)
   * `user.status`   ➔ Base Register + **Slot 5** (प्रतिक्रिया स्लट)

---

## ४. सबै कुरा भेरिएबलमा हुन्छ (Everything is a Variable)

डाँफेमा हिज्जे गल्ती (Typo) हुने कुनै जोखिम हुँदैन किनकि सबै कुरा सिधै भेरिएबलको रूपमा उपलब्ध हुन्छ:

```jsx
import { h } from 'danphe-web';
import { user } from './app';

export function UserProfileCard() {
  return (
    <div className="card glass p-5 space-y-4">
      <h3 className="text-white font-bold">प्रयोगकर्ता प्रोफाइल</h3>

      {/* १. इनपुटमा सिधै भेरिएबल पास: rx={user.name} */}
      <div>
        <label className="text-xs text-slate-400">नाम (Slot 1):</label>
        <input 
          rx={user.name} 
          placeholder="पूरा नाम" 
          className="w-full card outlined p-3 text-white" 
        />
      </div>

      {/* २. इनपुटमा सिधै भेरिएबल पास: rx={user.email} */}
      <div>
        <label className="text-xs text-slate-400">इमेल (Slot 2):</label>
        <input 
          rx={user.email} 
          placeholder="इमेल ठेगाना" 
          className="w-full card outlined p-3 text-white" 
        />
      </div>

      {/* ३. बटनमा सिधै ट्रान्समिट भेरिएबल: tx={user.submit} */}
      <button tx={user.submit} className="filled fx-crystal md glow cursor-pointer w-full py-3">
        <span>💾 सर्भरमा सुरक्षित गर्नुहोस् (TX)</span>
      </button>

      {/* ४. लाइभ भेरिएबल प्रदर्शन */}
      <div className="text-xs text-slate-300">
        स्थिति: <span rx={user.status} className="font-bold text-emerald-400">तयार</span>
      </div>
    </div>
  );
}
```

> **सुझाव (Dual Syntax):**  
> डाँफे-वेबले भेरिएबल सिन्ट्याक्स (`rx={user.name}`) का साथै स्ट्रिङ सिन्ट्याक्स (`rx="user::name"`) दुवैलाई पूर्ण रूपमा समर्थन गर्दछ।

---

## ५. पूरै फारमको डाटा एकमुष्ट प्राप्त गर्न (`$raw`)

यदि फारमका सबै स्लटहरूको डाटा एकैपटक साधारण JSON अब्जेक्टमा चाहियो भने `$raw` गुण प्रयोग गर्न सकिन्छ:

```javascript
const payload = user.$raw;
console.log(payload);
// आउटपुट: { name: 'शंकर फुयाल', email: 'shankar@gmail.com', password: '...', submit: '', status: '' }
```

---

## ६. प्रत्यक्ष DOM पोइन्टर (Zero-VDOM Direct DOM Pointer)

परम्परागत रियाक्टमा हरेक किस्ट्रोकमा कम्पोनेन्ट रि-रेन्डर हुन्छ र भर्चुअल DOM डिफिङ चल्छ। तर डाँफेमा:
* `bindInput()` ले इनपुटमा सिधै नेटिभ DOM इभेन्ट जोड्छ।
* प्रयोगकर्ताले किबोर्डमा थिच्दा कुनै VDOM नचली **१ माइक्रोसेकेन्ड भन्दा कम समयमा** सिधै स्लट मेमोरी र सम्बन्धित DOM नोड अद्यावधिक हुन्छ।

---

## ७. डटेड ट्याग र देवनागरी युनिकोड समर्थन (Dotted Components & Unicode)

डाँफे पार्सरले नेस्टेड कम्पोनेन्टहरू र देवनागरी अक्षरहरूलाई पहिलो श्रेणीको नागरिकको रूपमा समर्थन गर्दछ:

```jsx
import { h } from 'danphe-web';

export const Everest = {
  Card: ({ children, शीर्षक }) => (
    <div className="card glass p-5 space-y-3">
      {शीर्षक && <h3 className="text-emerald-400 font-bold">{शीर्षक}</h3>}
      <div>{children}</div>
    </div>
  ),
  ब्याच: ({ स्थिति }) => (
    <span className="badge fx-neon">
      {स्थिति}
    </span>
  )
};

// प्रयोग:
export default function ड्यासबोर्ड() {
  return (
    <Everest.Card शीर्षक="प्रणाली स्थिति">
      <Everest.ब्याच स्थिति="सक्रिय" />
    </Everest.Card>
  );
}
```
