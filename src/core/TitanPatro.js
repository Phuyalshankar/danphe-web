'use strict';

/**
 * 🇳🇵 Dolphin Patro Engine (Serially Synchronized via Titan Bus)
 * Highly accurate Bikram Sambat calendar computation for BS 2080-2086
 */

const MONTHS_NP = ["वैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "असोज", "कार्तिक", "मंसिर", "पुस", "माघ", "फाल्गुन", "चैत"];
const MONTHS_EN = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const DAYS_NP = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NEP_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

const COMPACT_BS_DAYS = {
  2080: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2083: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31]
};

function nepali(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, d => NEP_DIGITS[Number(d)]);
}

function _toJulianDay(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function fromAD(year, month, day, hour = -1, min = -1, sec = -1) {
  if (typeof window !== 'undefined' && window.__TITAN_PATRO__) {
    return window.__TITAN_PATRO__;
  }

  const targetJdn = _toJulianDay(year, month, day);
  let currentJdn = _toJulianDay(2023, 4, 15); // Anchor: 2080-01-01 BS = 2023-04-15 AD
  let bsYear = 2080;
  let bsMonth = 1;
  let bsDay = 1;

  while (bsYear <= 2086) {
    const daysInYear = (COMPACT_BS_DAYS[bsYear] || [31,31,32,31,31,30,30,30,29,30,29,30]).reduce((a,b) => a+b, 0);
    if (currentJdn + daysInYear > targetJdn) break;
    currentJdn += daysInYear;
    bsYear++;
  }

  const mDays = COMPACT_BS_DAYS[bsYear] || [31,31,32,31,31,30,30,30,29,30,29,30];
  while (bsMonth <= 12) {
    const daysInMonth = mDays[bsMonth - 1] || 30;
    if (currentJdn + daysInMonth > targetJdn) break;
    currentJdn += daysInMonth;
    bsMonth++;
  }

  bsDay += Math.round(targetJdn - currentJdn);
  const mNp = MONTHS_NP[bsMonth - 1] || '';
  const mEn = MONTHS_EN[bsMonth - 1] || '';

  let vaarIndex = Math.floor((Math.floor(targetJdn + 1.5)) % 7);
  if (vaarIndex < 0) vaarIndex += 7;

  const formatted = `${nepali(bsYear)} ${mNp} ${nepali(bsDay)}, ${DAYS_NP[vaarIndex]}`;
  const res = {
    year: bsYear,
    month: bsMonth,
    day: bsDay,
    monthName: mNp,
    monthNameEn: mEn,
    dayName: DAYS_EN[vaarIndex],
    vaar: DAYS_NP[vaarIndex],
    formatted,
    formattedNepali: formatted,
    miti: formatted,
    gate: nepali(bsDay),
    gateNum: bsDay,
    bar: DAYS_NP[vaarIndex],
    mahina: mNp,
    barsa: nepali(bsYear),
    barsaNum: bsYear
  };

  if (hour >= 0) {
    const ampm = hour < 12 ? 'AM' : 'PM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    res.time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    res.samaya = `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
  }

  return res;
}

function aja() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const npt = new Date(utc + (5.75 * 3600000));
  return fromAD(npt.getFullYear(), npt.getMonth() + 1, npt.getDate(), npt.getHours(), npt.getMinutes(), npt.getSeconds());
}

const aaja = aja;
function miti() { return aja().miti; }
function gate() { return aja().gate; }
function bar() { return aja().bar; }
function samaya() { return aja().samaya; }
function mahina() { return aja().mahina; }
function barsa() { return aja().barsa; }

const Patro = {
  aja,
  aaja,
  miti,
  gate,
  bar,
  samaya,
  mahina,
  barsa,
  nepali,
  fromAD
};

const TitanPatro = Patro;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitanPatro;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TitanPatro = TitanPatro;
  globalThis.Patro = Patro;
  globalThis.aja = aja;
  globalThis.aaja = aaja;
  globalThis.miti = miti;
  globalThis.gate = gate;
  globalThis.bar = bar;
  globalThis.samaya = samaya;
  globalThis.mahina = mahina;
  globalThis.barsa = barsa;
  globalThis.nepali = nepali;
}
if (typeof window !== 'undefined') {
  window.TitanPatro = TitanPatro;
  window.Patro = Patro;
  window.aja = aja;
  window.aaja = aaja;
  window.miti = miti;
  window.gate = gate;
  window.bar = bar;
  window.samaya = samaya;
  window.mahina = mahina;
  window.barsa = barsa;
  window.nepali = nepali;
}
