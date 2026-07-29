// Merkezi AI model listesi — tüm AI Studio bileşenleri buradan import eder
export const OPENROUTER_MODELS = [
  // Ücretsiz
  { value: "google/gemma-2-9b-it:free", label: "Gemma 2 9B", tag: "Ücretsiz", cat: "free" },
  { value: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B", tag: "Ücretsiz", cat: "free" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B", tag: "Ücretsiz", cat: "free" },
  // Ekonomik
  { value: "google/gemini-2.5-flash-lite", label: "Gemini Flash Lite", tag: "Ekonomik", cat: "cheap" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", tag: "Ekonomik", cat: "cheap" },
  { value: "anthropic/claude-haiku-4", label: "Claude Haiku 4", tag: "Ekonomik", cat: "cheap" },
  // Standart
  { value: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano", tag: "Standart", cat: "standard" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "Standart", cat: "standard" },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", tag: "Standart", cat: "standard" },
  // Premium
  { value: "openai/gpt-4o", label: "GPT-4o", tag: "Premium", cat: "premium" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", tag: "Premium", cat: "premium" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", tag: "Premium", cat: "premium" },
  // Ultra
  { value: "anthropic/claude-opus-4", label: "Claude Opus 4", tag: "Ultra", cat: "ultra" },
  { value: "openai/o3", label: "O3", tag: "Ultra", cat: "ultra" },
];

export const MODEL_CAT_LABELS = {
  free: "🆓 Ücretsiz",
  cheap: "💰 Ekonomik",
  standard: "⭐ Standart",
  premium: "💎 Premium",
  ultra: "🚀 Ultra",
};

export const MODEL_CATS_ORDER = ["free", "cheap", "standard", "premium", "ultra"];