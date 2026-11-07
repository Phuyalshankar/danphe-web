# ⚡ TITAN REGISTERBANK & HARDWARE BUS SPECIFICATION
═══════════════════════════════════════════════════════════════════════════════════════
**Specification:** Titan Universal SISO 16-Bit Hardware Register Bank & Memory Architecture  
**Architecture:** Zero-Overhead Memory-Mapped Input/Output (MMIO) with Network Ingress Firewall  
**Syntax Support:** Declarative Dynamic DSL (`reg <scope>:: <var1>, <var2>;`) & Hex Register Maps  
**Target Environments:** Android Native (Kotlin), ThorVG (C++), Web (ES6 / DolphinWebEngine)

---

## 📑 TABLE OF CONTENTS
1. [रजिस्टर आर्किटेक्चर (Register Definition Architecture)](#1-रजिस्टर-आर्किटेक्चर-register-definition-architecture)
2. [युनिभर्सल मेमोरी म्याप र जोन विभाजन (Universal Memory Map & Zones)](#2-युनिभर्सल-मेमोरी-म्याप-र-जोन-विभाजन-universal-memory-map--zones)
3. [Wi-Fi इन्ग्रेस फायरवाल सुरक्षा नियम (Network Ingress Firewall Security)](#3-wi-fi-इन्ग्रेस-फायरवाल-सुरक्षा-नियम-network-ingress-firewall-security)
4. [मास्टर सिस्टम तथा हार्डवेयर रजिस्टर सूची (Master Hardware Register Directory)](#4-मास्टर-सिस्टम-तथा-हार्डवेयर-रजिस्टर-सूची-master-hardware-register-directory)
5. [The SISO (Single-Input Single-Output) Engine](#5-the-siso-single-input-single-output-engine)
6. [डाइनामिक रजिस्टर रिएबल प्रणाली (`reg` DSL)](#6-डाइनामिक-रजिस्टर-रिएबल-प्रणाली-reg-dsl)
7. [ह्युमन-फ्रेन्डली एलियासहरू (System Aliases & Shortcuts)](#7-ह्युमन-फ्रेन्डली-एलियासहरू-system-aliases--shortcuts)
8. [हार्डवेयर बस डिबगिङ प्लेबुक (Hardware Bus Debugging Playbook)](#8-हार्डवेयर-बस-डिबगिङ-प्लेबुक-hardware-bus-debugging-playbook)

---

## 1. रजिस्टर आर्किटेक्चर (REGISTER DEFINITION ARCHITECTURE)

Titan फ्रेमवर्कमा कुनै पनि कम्पोनेन्ट, हार्डवेयर एक्चुएटर वा डाटा स्ट्रिमलाई जटिल स्टेट म्यानेजर (जस्तै Redux वा Zustand) बिना सिधै **१६-बिट मेमोरी-म्याप्ड रजिस्टर ठेगानाहरू** मार्फत नियन्त्रण गरिन्छ।

### मुख्य सिद्धान्तहरू:
1. **Zero-Overhead Memory Access:** प्रत्येक रजिस्टर १६-बिट ठेगाना (`0x0000` देखि `0xFFFF`) मा आधारित हुन्छ र सिधै नेटिभ मेमोरी (`IntArray(65536)`) मा म्याप हुन्छ।
2. **Dynamic DSL Integration:** विकासकर्ताले म्यानुअल फाइलहरू बनाउनु पर्दैन। Danphe Lexer ले `reg auth:: token, status;` जस्ता स्टेटमेन्टहरूलाई सिधै कम्पाइल-टाइममा User Space रजिस्टरमा म्याप गर्दछ।
3. **Absolute Decoupling:** UI कम्पोनेन्टहरूले हार्डवेयरको आन्तरिक कार्यप्रणाली थाहा पाउनु पर्दैन; केवल `rx="live"` वा `tx="torch"` लेखेर सिधै हार्डवेयरसँग कुराकानी गर्दछन्।

---

## 2. युनिभर्सल मेमोरी म्याप र जोन विभाजन (UNIVERSAL MEMORY MAP & ZONES)

Titan RegisterBank ले ० देखि ६५,५३५ सम्मका १६-बिट ठेगानाहरूलाई २ मुख्य खण्ड र ५ व्यवस्थित जोनहरूमा विभाजन गरेको छ:

```
ठेगाना दायरा (Hex)    दायरा (Dec)       जोनको नाम                     मुख्य जिम्मेवारी
─────────────────────────────────────────────────────────────────────────────────────────────
[ SYSTEM HARDWARE ABSTRACTION LAYER (HAL) - नेटवर्कबाट सुरक्षित ]
0x0000 - 0x0FFF     00000 - 04095     ZONE 0: System Core & State    Power, Heartbeat, Routes, Telemetry
0x1000 - 0x1FFF     04096 - 08191     ZONE 1: Hardware Sensors       Battery, Network, NFC, Gyro, GPS
0x2000 - 0x2FFF     08192 - 12287     ZONE 2: UI Touch & Input       Touch X/Y, Gestures, Keypad Buffer
0x3000 - 0x3FFF     12288 - 16383     ZONE 3: Actuators & Media HAL  Camera, Torch, Mic, Audio, Haptics

[ USER APPLICATION SPACE - नेटवर्क तथा एप डाटाको लागि खुला ]
0x4000 - 0x7FFF     16384 - 32767     ZONE 4: Dynamic User Space     Dynamic `reg` Variables, Forms, State
0x8000 - 0xFFFF     32768 - 65535     ZONE 5: Universal Slots Space  Extended Data Carriers & IoT Relays
─────────────────────────────────────────────────────────────────────────────────────────────
```

---

## 3. WI-FI इन्ग्रेस फायरवाल सुरक्षा नियम (NETWORK INGRESS FIREWALL SECURITY)

हार्डवेयर सुरक्षाको लागि Titan-Bus मा **Network Ingress Firewall** नियम अनिवार्य गरिएको छ:

1. **System HAL Protection (`0x0000` - `0x3FFF`):**
   - बाहिरी Wi-Fi, WebSocket वा HTTP नेटवर्कबाट सिधै Zone 0 देखि Zone 3 सम्मका भौतिक हार्डवेयर रजिस्टरहरू (जस्तै क्यामेरा `0x3011`, माइक `0x3012`, टर्च `0x3010`, सोलेनोइड लक) मा राइट (Write) गर्न निषेध गरिएको छ।
   - कुनै अनधिकृत नेटवर्क प्याकेटले सिस्टम रजिस्टरमा लेख्न खोजेमा सर्भरले तुरुन्त `403 Forbidden` कोड फर्काउँछ।
2. **Master Permit Override (`0x3090`):**
   - यदि प्रयोगकर्ताले स्थानीय डिभाइसमा भौतिक रूपमा अनुमति दिएको छ (`SYS_REMOTE_HARDWARE_PERMIT = 0x3090` सक्रिय छ) भने मात्र बाहिरी नेटवर्कबाट हार्डवेयर नियन्त्रण गर्न पाइन्छ।
3. **Open User Space (`0x4000` - `0x7FFF`):**
   - एपका सामान्य सन्देशहरू, फारम डाटा, च्याट र टेलिमेट्रीका लागि Zone 4 खुला रहन्छ।

---

## 4. मास्टर सिस्टम तथा हार्डवेयर रजिस्टर सूची (MASTER HARDWARE REGISTER DIRECTORY)

### Zone 0: System Core, Heartbeat & Navigation
- `SYSTEM_MAGIC` (`0x0000`): प्रोटोकल पहिचानकर्ता (`0x5449` = "TI")।
- `SYS_POWER` (`0x0001`): सिस्टम पावर स्थिति (`0` = Off, `1` = Active, `2` = Standby)।
- `SYS_HEARTBEAT` (`0x0002`): सेकेन्ड-वाचडग काउन्टर।
- `SYS_ROUTE` (`0x000A`): १६-बिट कम्पोजिट नेभिगेसन मार्ग (Folder ID << 8 | Page ID)।
- `SYS_THEME_MODE` (`0x000C`): थिम मोड (`0` = Auto, `1` = Dark, `2` = Light)।
- `UI_SCROLL_Y` (`0x0015`): भ्यू-पोर्ट स्क्रोल विस्थापन (Vertical Scroll Offset)।

### Zone 1: सेन्सर तथा कनेक्टिभिटी
- `TEL_BATTERY` (`0x1000`): ब्याट्री प्रतिशत (`0` - `100%`)।
- `TEL_CHARGING` (`0x1001`): चार्जिङ स्थिति (`0` = Discharging, `1` = Charging)।
- `TEL_ONLINE` (`0x1010`): नेटवर्क जडान (`0` = Offline, `1` = Online)।
- `NETWORK_TYPE` (`0x1011`): नेटवर्कको प्रकार (`1` = WiFi, `2` = Cellular, `3` = Ethernet)।
- `BLUETOOTH_STATE` (`0x1020`): ब्लुटुथ स्थिति (`0` = Off, `1` = On, `2` = Connected)।

### Zone 3: भौतिक एक्चुएटर तथा मल्टिमिडिया HAL
- `ACT_HAPTIC` (`0x3000`): भाइब्रेसन पल्स (`1`=Click, `2`=Medium, `3`=Heavy, `4`=Success, `5`=Error)।
- `ACT_TORCH` (`0x3010`): क्यामेरा टर्च/फ्ल्यासलाइट अन/अफ (`0` = Off, `1` = On)।
- `MEDIA_CAMERA_STREAM` (`0x3011`): प्रत्यक्ष क्यामेरा ३० FPS स्ट्रिम नियन्त्रण।
- `MEDIA_MIC_STREAM` (`0x3012`): ४:१ IMA-ADPCM अडियो स्ट्रिम नियन्त्रण।
- `SYS_REMOTE_HARDWARE_PERMIT` (`0x3090`): नेटवर्कबाट हार्डवेयर चलाउने रिमोट परमिट टगल।

---

## 5. THE SISO (SINGLE-INPUT SINGLE-OUTPUT) ENGINE

SISO इन्जिन Danphe Native को ०ms सिङ्क्रोनस स्टेट बस हो:
1. **Deduplication:** पुरानै मान दोहोरिएर लेख्न खोज्दा SISO ले ०ms मा बाइपास गर्छ (`memory[reg] == val -> return`)। यसले गर्दा अनावश्यक रिरेन्डर र ब्याट्री खपत रोकिन्छ।
2. **Action Pulsing:** पल्स एक्सनहरू (जस्तै `haptic` वा `pulse`) मा भने प्रत्येक ट्रिगर तत्काल नेटिभ लेयरमा पठाइन्छ।
3. **Atomic Execution:** सम्पूर्ण रिड र राइट अपरेसनहरू थ्रेड-सुरक्षित (Thread-Safe) छन्।

---

## 6. डाइनामिक रजिस्टर रिएबल प्रणाली (`reg` DSL)

अब कुनै पनि एप्लिकेसन निर्माण गर्दा म्यानुअल फाइलहरू बनाउनु पर्दैन:

```danphe
// Dynamic User Space Allocation (Zone 4)
reg auth:: token, status, role;
reg form:: name, email, phone;
```

Danphe Lexer ले `auth` लाई Zone 4 भित्रको एउटा १६-बिट रजिस्टर र `token`, `status`, `role` लाई सोही रजिस्टरका क्रमशः २५६ सब-स्लटहरू (`0x00`, `0x01`, `0x02`) मा स्वतः म्याप गर्दछ।

---

## 7. ह्युमन-फ्रेन्डली एलियासहरू (SYSTEM ALIASES & SHORTCUTS)

हेक्स कोड याद गर्न नपरोस् भनेर Titan-Bus ले सामान्य सिस्टम सर्टकटहरूलाई स्वतः रिजोल्भ गर्दछ:

| एलियास (Alias) | आन्तरिक रजिस्टर | भूमिका |
| :--- | :--- | :--- |
| `tx="live"` | `0x3011` (Camera Stream) | क्यामेरा ३० FPS स्ट्रिमिङ सुरु/बन्द गर्न |
| `tx="torch"` | `0x3010` (ACT_TORCH) | टर्च बाल्न वा निभाउन |
| `rx="battery"` | `0x1000` (TEL_BATTERY) | डिभाइस ब्याट्री प्रतिशत देखाउन |
| `rx="diskstatus"`| `0x0018` (SYS_DISK_STATUS)| स्टोरेज क्षमता र डिस्क स्थिति |
| `tx="haptic"` | `0x3000` (ACT_HAPTIC) | स्पर्श प्रतिक्रिया (Vibration) पल्स पठाउन |

---

## 8. हार्डवेयर बस डिबगिङ प्लेबुक (HARDWARE BUS DEBUGGING PLAYBOOK)

Titan Runtime ले पोर्ट `9091` मा TCP सर्भर र पोर्ट `9090` मा HTTP/WebSocket सर्भर चलाउँछ:

1. **सबै सक्रिय रजिस्टरहरू हेर्न:**
   - कमाण्ड: `nc 127.0.0.1 9091` वा ब्राउजरमा `http://<DEVICE_IP>:9090/titan-live`
2. **रजिस्टरमा मान लेखेर जाँच्न:**
   - कमाण्ड: `WRITE 0x3010 1` (टर्च बाल्न) वा `WRITE 0x3000 1` (भाइब्रेट गराउन)।
3. **लग निरीक्षण:**
   - Logcat फिल्टर: `TitanSisoEngine` वा `TitanBusServer`।
