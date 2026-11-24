/** Languages offered for speaking to Antra: BCP-47 tags the browsers' speech services understand. */
export const VOICE_LANGUAGES = [
  { code: "en-IN", label: "English / Hinglish" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
] as const;

export type VoiceLang = (typeof VOICE_LANGUAGES)[number]["code"];

/** The language to start with: the app's own language if speech can be recognised in it, otherwise Indian English. */
export function defaultVoiceLang(appLocale: string | undefined): VoiceLang {
  const wanted = (appLocale ?? "").toLowerCase();
  const exact = VOICE_LANGUAGES.find((l) => l.code.toLowerCase() === wanted);
  if (exact) return exact.code;
  const base = wanted.split("-")[0];
  return VOICE_LANGUAGES.find((l) => l.code.split("-")[0] === base)?.code ?? "en-IN";
}

export function isVoiceLang(v: string | null | undefined): v is VoiceLang {
  return VOICE_LANGUAGES.some((l) => l.code === v);
}

/** Appends spoken text to what is already in the box, with one space between and no stray whitespace. */
export function joinTranscript(base: string, spoken: string): string {
  const s = spoken.trim();
  if (!s) return base;
  const b = base.replace(/\s+$/, "");
  return b ? `${b} ${s}` : s;
}

export type SpeechProblem = "denied" | "noSpeech" | "noMic" | "network" | "language" | "server" | "other";

/** Maps a browser's speech error code to the few things a person can actually do something about. */
export function speechProblem(code: string): SpeechProblem | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "denied";
    case "no-speech":
      return "noSpeech";
    case "audio-capture":
      return "noMic";
    case "network":
      return "network";
    case "language-not-supported":
      return "language";
    case "aborted":
      return null; // the person stopped it; not a problem
    default:
      return "other";
  }
}

/** Which engine wrote down a spoken question, and in which language. */
export type VoiceMeta = { engine: string; lang: string };

/** Reasons offered when an answer gets a thumbs down. The codes are what the server stores. */
export const FEEDBACK_REASONS = ["WRONG_NUMBERS", "WRONG_LANGUAGE", "NOT_ANSWERED", "TOO_LONG", "TOO_SLOW", "OTHER"] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
