import type { LocaleInfo } from "@/lib/api";

/** Fallback when /api/v1/meta/locales is unavailable (mirrors backend application.yml). */
export const FALLBACK_LOCALES: LocaleInfo[] = [
  { code: "en-IN", label: "English", nativeLabel: "English", stateCode: "IN", stateName: "All India", stateNameNative: "India", regionGroup: "Pan-India", sortOrder: 0 },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी", stateCode: "HI", stateName: "Hindi-speaking states", stateNameNative: "हिंदी भाषी राज्य", regionGroup: "North & Central India", sortOrder: 10 },
  { code: "pa-IN", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", stateCode: "PB", stateName: "Punjab", stateNameNative: "ਪੰਜਾਬ", regionGroup: "North India", sortOrder: 11 },
  { code: "bn-IN", label: "Bengali", nativeLabel: "বাংলা", stateCode: "WB", stateName: "West Bengal", stateNameNative: "পশ্চিমবঙ্গ", regionGroup: "East India", sortOrder: 12 },
  { code: "gu-IN", label: "Gujarati", nativeLabel: "ગુજરાતી", stateCode: "GJ", stateName: "Gujarat", stateNameNative: "ગુજરાત", regionGroup: "West India", sortOrder: 20 },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी", stateCode: "MH", stateName: "Maharashtra", stateNameNative: "महाराष्ट्र", regionGroup: "West India", sortOrder: 21 },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ", stateCode: "KA", stateName: "Karnataka", stateNameNative: "ಕರ್ನಾಟಕ", regionGroup: "South India", sortOrder: 30 },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు", stateCode: "AP", stateName: "Andhra Pradesh & Telangana", stateNameNative: "ఆంధ్ర ప్రదేశ్ & తెలంగాణ", regionGroup: "South India", sortOrder: 31 },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்", stateCode: "TN", stateName: "Tamil Nadu", stateNameNative: "தமிழ்நாடு", regionGroup: "South India", sortOrder: 32 },
  { code: "ml-IN", label: "Malayalam", nativeLabel: "മലയാളം", stateCode: "KL", stateName: "Kerala", stateNameNative: "കേരളം", regionGroup: "South India", sortOrder: 33 },
];
