# ⚡ Danphe-Web: सिरियल कम्युनिकेटर र रियाक्टिभ बस (Serial Communicator & Reactive Bus)

> **शून्य-फेच सिरियल वास्तुकला (Zero-Fetch) • ६-बाइट माइक्रो-SISO • सिरियल स्ट्रिम • SSE लाइभ ब्रोडकास्ट • इन्टरप्राइज सुरक्षा**

---

## १. शून्य-फेच सिरियल वास्तुकला के हो? (What is Zero-Fetch Serial Bus?)

परम्परागत वेब एपहरूमा क्लाइन्टले सर्भरसँग कुरा गर्न `fetch('/api/...')` वा `axios` चलाउँछ। यसले गर्दा नेटवर्क लेटन्सी, म्यानुअल प्रमिस ह्यान्डलिङ, र जटिल रि-रेन्डर चक्र उत्पन्न हुन्छ।

डाँफे-वेबमा **क्लाइन्टले कहिल्यै `fetch()` गर्दैन**:
1. क्लाइन्टले केवल क्यारियर स्लटहरूमा डाटा राख्छ र बटनमा `tx={user.submit}` तोक्छ।
2. रनटाइमले यसलाई **सिरियल स्ट्रिम (Serial Stream)** बनाएर सिधै कम्युनिकेटर सर्भरमा पठाउँछ।
3. सर्भरले सिरियल प्याकेट डिकोड गर्छ, आन्तरिक डाटाबेस वा प्रमाणीकरण जाँच गर्छ, र नतिजा आउटपुट स्लटमा लेख्छ।
4. बसले SSE (`/bus/stream`) मार्फत उक्त नतिजा ब्रोडकास्ट गर्छ र क्लाइन्टको स्क्रिन बिना कुनै रिलोड स्वतः १ माइक्रोसेकेन्डमा अद्यावधिक हुन्छ।

```
┌────────────────────────────────────────────────────────┐
│               वेब क्लाइन्ट (Web Client)                 │
│  - Base Register: 'user'                               │
│  - Slot 1 (name), Slot 2 (email), Slot 3 (pass)        │
│  - Button: <button tx={user.submit}>                   │
└──────────────────────────┬─────────────────────────────┘
                           │ ⚡ Serial Stream / Micro-SISO (0x5349)
                           ▼
┌────────────────────────────────────────────────────────┐
│             TitanCommunicatorServer (Node.js)          │
│  - Serial Packet Decoder                               │
│  - Pure Action Handlers (app.logic.js)                 │
│  - 1MB DoS Guard & SSRF Protection                     │
└──────────────────────────┬─────────────────────────────┘
                           │ ⚡ SSE Patch Broadcast (/bus/stream)
                           ▼
┌────────────────────────────────────────────────────────┐
│          क्लाइन्ट प्रत्यक्ष DOM पोइन्टर (< 1 µs)         │
│          <span rx={user.status}> लाइभ अद्यावधिक         │
└────────────────────────────────────────────────────────┘
```

---

## २. ६-बाइट माइक्रो-SISO सिरियल प्रोटोकल (Micro-SISO Protocol)

हार्डवेयर-ग्रेड सञ्चारका लागि डाँफेले ६-बाइट बाइनरी संरचना प्रयोग गर्दछ:

```
Byte 0..1: 0x5349 ('SI' - Magic Header)
Byte 2..3: Register Address (16-bit Unsigned, Big-Endian)
Byte 4..5: Slot Value / Integer Payload (16-bit Signed, Big-Endian)
```

यसले गर्दा मोबाइल, वेब र भौतिक माइक्रोकन्ट्रोलर बीच न्यूनतम ब्यान्डविथ र शून्य ओभरहेडमा रियल-टाइम सिरियल सञ्चार सम्भव हुन्छ।

---

## ३. सिरियल स्ट्रिम प्रोसेसिङ (`TitanCommunicatorServer.js`)

सर्भरले सिरियल चंकहरूलाई यसरी बाइट-बाई-बाइट बटुलेर लाइन फ्रेममा डिकोड गर्छ:

```javascript
// TitanCommunicatorServer.js
_handleSerialChunk(chunk) {
  this.serialBuffer += chunk.toString('utf8');

  let nlIdx;
  while ((nlIdx = this.serialBuffer.indexOf('\n')) !== -1) {
    const line = this.serialBuffer.slice(0, nlIdx).trim();
    this.serialBuffer = this.serialBuffer.slice(nlIdx + 1);
    this._handleSerialLine(line);
  }
}
```

---

## ४. सर्भर एक्सन ह्यान्डलिङ (`app.logic.js`)

जब ब्राउजरबाट `tx={user.submit}` ट्रिगर हुन्छ, कम्युनिकेटर सर्भरले `app.logic.js` भित्रको सम्बन्धित फङ्सन चलाउँछ:

```javascript
// app.logic.js
module.exports = {
  'user::submit': ({ rx, tx }) => {
    // १. स्लट मेमोरीबाट डाटा पढ्ने
    const name = rx('user::name');
    const email = rx('user::email');
    const pass = rx('user::password');

    console.log(`📡 सिरियल डाटा प्राप्त -> Name: ${name}, Email: ${email}`);

    // २. सर्भर साइड प्रमाणीकरण
    if (!name || !email) {
      tx('user::status', '⚠️ त्रुटि: नाम र इमेल अनिवार्य छन्!');
      return;
    }

    if (pass.length < 6) {
      tx('user::status', '⚠️ त्रुटि: पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ!');
      return;
    }

    // ३. आउटपुट स्लटमा नतिजा लेख्ने (जुन क्लाइन्टमा स्वतः जान्छ)
    tx('user::status', `✅ सफल: ${name} दर्ता हुनुभयो!`);
  }
};
```

---

## ५. सर्भर सुरक्षा सुविधाहरू (Enterprise-Grade Security)

`TitanCommunicatorServer` मा निर्मित सुरक्षा विशेषताहरू:
1. **१ एमबी DoS सुरक्षा:** १ एमबी भन्दा ठूला पेलोड सर्भरले स्वतः अस्वीकार गर्छ, जसले बफर ओभरफ्लो र मेमोरी क्र्यास रोक्छ।
2. **SSRF शील्ड:** क्लाउड आन्तरिक मेटाडाटा आईपीहरू (जस्तै `169.254.169.254`) लाई कडाइका साथ ब्लक गरिएको छ।
3. **मेमोरी सीमा (Bounded Store):** मेमोरी लिक रोक्न अधिकतम १०,००० स्लट/रजिस्टरको कडा सीमा लागू गरिएको छ।
4. **Try/Catch एरर ट्र्यापिङ:** सर्भरमा कुनै त्रुटि भएमा सर्भर क्र्यास हुँदैन; त्रुटिलाई `error::code` र `error::message` स्लटमा लेखेर सुरक्षित राखिन्छ।
