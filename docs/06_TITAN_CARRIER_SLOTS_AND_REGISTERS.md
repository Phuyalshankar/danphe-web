# ⚡ TITAN CARRIER SLOTS & DYNAMIC REGISTER SPECIFICATION
═══════════════════════════════════════════════════════════════════════════════════════
**Specification:** Titan Universal Carrier Slot Architecture & Dynamic Register System  
**Core Principles:** Zero-Virtual DOM • Microsecond Latency (< 1 µs) • Deterministic In-Memory Modulation  
**Syntax:** Modern Danphe DSL (`reg <namespace>:: <var1>, <var2>;`)  
**Address Space:** 65,536 Main Registers × 256 Carrier Slots = 16,777,216 Total Addressable Slots  
**Target Environments:** Android Native (Kotlin), Web (ES6 / DolphinWebEngine), Embedded / IoT (ESP32)

---

## 📑 TABLE OF CONTENTS
1. [वास्तुकलाको नयाँ परिचय (Modern Architecture Overview)](#1-वास्तुकलाको-नयाँ-परिचय-modern-architecture-overview)
2. [डाइनामिक रजिस्टर रिएबल सिन्ट्याक्स (`reg` DSL)](#2-डाइनामिक-रजिस्टर-रिएबल-सिन्ट्याक्स-reg-dsl)
3. [१६.७ मिलियन स्लट एड्रेसिङ स्पेस (16.7M Universal Carrier Slots)](#3-१६७-मिलियन-स्लट-एड्रेसिङ-स्पेस-167m-universal-carrier-slots)
4. [डाइनामिक स्लट मोडुलेसन र अपकोडहरू (Slot Modulation Opcodes)](#4-डाइनामिक-स्लट-मोडुलेसन-र-अपकोडहरू-slot-modulation-opcodes)
5. [टाइपकास्टिङ बिना कच्चा बाइनरी ह्यान्डलिङ (Zero Mandatory Typecasting)](#5-टाइपकास्टिङ-बिना-कच्चा-बाइनरी-ह्यान्डलिङ-zero-mandatory-typecasting)
6. [Wi-Fi इन्ग्रेस सेक्युरिटी फायरवाल (Network Ingress Security)](#6-wi-fi-इन्ग्रेस-सेक्युरिटी-फायरवाल-network-ingress-security)
7. [UI कम्पोनेन्टमा रिएक्टिभ बाइन्डिङ (Declarative UI Usage)](#7-ui-कम्पोनेन्टमा-रिएक्टिभ-बाइन्डिङ-declarative-ui-usage)
8. [२४-बाइट बाइनरी फ्रेम लेआउट (24-Byte Binary Frame Layout)](#8-२४-बाइट-बाइनरी-फ्रेम-लेआउट-24-byte-binary-frame-layout)

---

## 1. वास्तुकलाको नयाँ परिचय (MODERN ARCHITECTURE OVERVIEW)

Danphe Native मा परम्परागत वेब/मोबाइल फ्रेमवर्कको जस्तो भारी `useState`, `useEffect`, वा `Virtual DOM Diffing` को झन्झट हुँदैन। पुरानो संस्करणको ८ वटा मात्र निश्चित स्लटहरू र म्यानुअल `TitanRegisters.js`/`TitanSlots.js` फाइल बनाउनुपर्ने झन्झटलाई पूर्ण रूपमा हटाएर आधुनिक **Dynamic Register DSL Engine** लागू गरिएको छ:

1. **Dynamic Register Variables (`reg` DSL):** कुनै पनि बाहिरी फाइल नबनाई सिधै कम्पोनेन्टको माथि `reg form:: name, email, phone;` लेखेर रजिस्टर र स्लटहरू स्वतः सिर्जना हुन्छन्।
2. **16-Bit Main Registers (65,536 Channels):** सिस्टम हार्डवेयर, हार्डवेयर पेरिफेरल्स, र एप लजिकलाई छुट्ट्याइएका ६५,५३६ वटा १६-बिट रजिस्टरहरू (`0x0000` देखि `0xFFFF`)।
3. **256 Sub-slots per Register (16.7 Million Total Slots):** प्रत्येक १६-बिट मुख्य रजिस्टरभित्र २५६ वटा सब-स्लटहरू (`0x00` देखि `0xFF`) उपलब्ध छन्। यसले कुल **१ करोड ६७ लाख ७७ हजार २ सय १६ (16,777,216)** वटा मेमोरी स्लटहरू प्रदान गर्दछ।

---

## 2. डाइनामिक रजिस्टर रिएबल सिन्ट्याक्स (`reg` DSL)

अब विकासकर्ताले कुनै पनि `TitanRegisters.js` वा `TitanSlots.js` फाइल बनाइरहनु पर्दैन। Danphe Lexer र Parser ले सिधै कोडबाट नै रिएबलहरूलाई रजिस्टर र स्लटमा म्याप गर्दछन्:

```danphe
// Dynamic Register Variable Declaration
reg auth:: token, status, role;
reg form:: name, email, phone, address, notes;
reg counter:: count, step, min, max;
```

### कम्पाउन्ड नेमस्पेस (Namespace Scoping):
- `reg auth:: ...` ले User Space Zone 4 (`0x4000+`) मा एउटा मुख्य १६-बिट रजिस्टर आरक्षित गर्छ।
- भित्रका चरहरू (`token`, `status`, `role`) क्रमशः सब-स्लट `0`, `1`, `2` मा स्वतः म्याप हुन्छन्।
- UI मा प्रयोग गर्दा सिधै नामबाट बाइन्ड गर्न सकिन्छ:
  - `rx="form::name"` वा `tx="form::name"`
  - `slot="form::email"`

---

## 3. १६.७ मिलियन स्लट एड्रेसिङ स्पेस (16.7M UNIVERSAL CARRIER SLOTS)

| तह (Hierarchy) | दायरा (Range) | क्षमता (Capacity) | भूमिका (Role) |
| :--- | :--- | :--- | :--- |
| **Main Register** | `0x0000` – `0xFFFF` | ६५,५३६ मुख्य च्यानलहरू | सिस्टम, सेन्सर, हार्डवेयर, र युजर नेमस्पेस |
| **Carrier Sub-Slot** | `0x00` – `0xFF` | प्रति रजिस्टर २५६ स्लटहरू | कार्ड सेल, फर्म इनपुट, सूची वस्तु (List Items) |
| **कुल सम्बोधनयोग्य स्लट** | `0x0000:0x00` – `0xFFFF:0xFF` | **१६,७७७,२१६ स्लटहरू** | सम्पूर्ण ग्लोबल र लोकल स्टेट बिना-डेटाबेस प्रसारण |

### स्लट एड्रेसिङ फर्मुला:
$$\text{Universal Slot Coordinate} = (\text{Main Register} \ll 8) \mid \text{Carrier Slot}$$

यसले गर्दा कुनै पनि डाटा पुनरावृत्ति (Data Repeater) जस्तै होटल कोठा, रेस्टुरेन्ट मेनु, वा च्याट सन्देशहरू बिना कुनै भर्चुअल डम (Virtual DOM) सिधै हार्डवेयर मेमोरीबाट स्क्रिनमा प्रतिविम्बित हुन्छन्।

---

## 4. डाइनामिक स्लट मोडुलेसन र अपकोडहरू (SLOT MODULATION OPCODES)

Titan-Bus ले डाटा प्रसारण गर्दा निम्न आधुनिक अपकोडहरू प्रयोग गर्दछ:

- `0x27` (**COLLECTION_PREP / STREAM_BURST**): स्लट कलेक्सन वा डाटा स्ट्रिम सुरु हुनुभन्दा अघि बफर खाली गर्न र सिङ्क्रोनाइज गर्न।
- `0x28` (**SLOT_DATA**): निश्चित सब-स्लटमा प्रत्यक्ष डाटा पेलोड पठाउन।
- `0x29` (**CARRIER_MAP**): डाइनामिक रजिस्टर चरहरू र स्लट म्यापिङ तालिका क्लाइन्ट रनटाइममा पठाउन।

---

## 5. टाइपकास्टिङ बिना कच्चा बाइनरी ह्यान्डलिङ (ZERO MANDATORY TYPECASTING)

Titan-Bus मा कुनै पनि स्लट वा रजिस्टरको लागि अनिवार्य टाइपकास्टिङ (Typecasting) चाहिँदैन:
- पूर्वनिर्धारित पेलोड ढाँचा `TITAN_TYPE.RAW = 0x00` हो।
- यसले टेक्स्ट (UTF-8 String), पूर्णाङ्क (Integer), फ्लोट (Float), वा बाइनरी ब्लब (Audio/Video/JPEG) लाई कुनै कन्भर्सन ओभरहेड बिना सिधै ग्रहण गर्दछ।
- यदि विकासकर्ताले चाहेमा मात्र ऐच्छिक टाइप फ्ल्यागहरू (`0x01 = INT32`, `0x02 = FLOAT`, `0x03 = UTF8_STRING`, `0x04 = AUDIO_ADPCM`, `0x05 = MJPEG_FRAME`) प्रयोग गर्न सकिन्छ।

---

## 6. WI-FI इन्ग्रेस सेक्युरिटी फायरवाल (NETWORK INGRESS SECURITY)

Titan-Bus एक शक्तिशाली हार्डवेयर बस भएकाले नेटवर्क/वाइफाइबाट अनाधिकृत पहुँच रोक्न इन्ग्रेस फायरवाल नीति अनिवार्य गरिएको छ:

```
[ बाहिरी Wi-Fi / नेटवर्क प्याकेट ]
              │
              ▼
    ┌───────────────────┐
    │  Ingress Filter   │
    └─────────┬─────────┘
              │
      Target Register?
      ├── 0x0000 - 0x3FFF (Zone 0-3: System HAL / क्यामरा, माइक, रिले)
      │     └─► [ ❌ ब्लक: 403 Forbidden ] (हार्डवेयर दुरुपयोग रोकियो)
      │          (केवल 0x3090 Master Permit अन हुँदा मात्र खुल्छ)
      │
      └── 0x4000 - 0x7FFF (Zone 4: User Space / फर्म, च्याट, एप डाटा)
            └─► [ ✅ स्वीकृत: 200 OK ] (सहज डाटा आदानप्रदान)
```

1. **System Actuators & Sensors (`0x0000` - `0x3FFF`):** क्यामेरा, टर्च, स्पिकर, माइक, रिले, र प्रणाली रिबुट नियन्त्रण गर्ने रजिस्टरहरू बाहिरी नेटवर्कबाट पूर्वनिर्धारित रूपमा ब्लक हुन्छन्।
2. **User Application Space (`0x4000` - `0x7FFF`):** फारम इनपुटहरू, च्याट म्यासेजहरू, र प्रयोगकर्ता स्टेटहरू नेटवर्कबाट सहजै पढ्न र लेख्न पाइन्छ।

---

## 7. UI कम्पोनेन्टमा रिएक्टिभ बाइन्डिङ (DECLARATIVE UI USAGE)

कम्पोनेन्टहरूमा अब पुरानो इन्टिजर स्लट आइडी (`slot="1"`) को सट्टा डाइनामिक नामहरू सिधै लेख्न सकिन्छ:

```jsx
<Danphe>
  {/* Dynamic Variable Declaration */}
  reg form:: name, email, phone;
  reg device:: cameraActive;

  <VStack padding="20" gap="12">
    {/* Form Input bound to dynamic slot */}
    <Input 
      placeholder="तपाईंको नाम" 
      tx="form::name" 
      rx="form::name" 
    />
    
    <Input 
      placeholder="इमेल ठेगाना" 
      tx="form::email" 
      rx="form::email" 
    />

    {/* Live Display bound to the same slot */}
    <Text rx="form::name" prefix="नमस्ते, " />

    {/* Hardware Trigger (Zone 3) */}
    <Button 
      text="क्यामेरा सुरु गर्नुहोस्" 
      tx="live" 
      action="pulse" 
    />
  </VStack>
</Danphe>
```

---

## 8. २४-बाइट बाइनरी फ्रेम लेआउट (24-BYTE BINARY FRAME LAYOUT)

Titan-Bus को प्रत्येक फ्रेम स्थिर २४ बाइट्सको हुन्छ जसले शून्य-पार्सिङ गतिको प्रत्याभूति गर्दछ:

```
Byte Offset   Field Name          Size      Description
─────────────────────────────────────────────────────────────────────────────
00 - 01       Magic Identifier    2 Bytes   0x5449 ("TI")
02            Opcode              1 Byte    0x20=Write, 0x27=Prep, 0x28=SlotData
03            Target Domain       1 Byte    0x01=UI, 0x02=HAL, 0x03=Network
04 - 07       Sequence Number     4 Bytes   32-bit monotonically increasing
08 - 11       Timestamp           4 Bytes   Unix epoch timestamp (seconds)
12 - 13       Main Register       2 Bytes   0x0000 to 0xFFFF (16-bit register)
14            Carrier Slot Index  1 Byte    0x00 to 0xFF (256 sub-slots)
15            Payload Data Type   1 Byte    0x00=RAW, 0x03=UTF8, 0x05=MJPEG
16 - 19       Payload Length      4 Bytes   Total byte length of trailing stream
20 - 23       CRC32 Checksum      4 Bytes   Hardware frame error verification
─────────────────────────────────────────────────────────────────────────────
Total Fixed Header: 24 Bytes
```
