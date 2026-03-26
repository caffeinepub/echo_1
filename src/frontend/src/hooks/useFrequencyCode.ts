const STORAGE_KEY = "echo_frequency_code";

function generateRawCode(): string {
  const rand = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  const cc = String(Math.floor(Math.random() * 89) + 10);
  const a = rand(3);
  const b = rand(3);
  const c = rand(4);
  return `+${cc} ${a}-${b}-${c}`;
}

export function useFrequencyCode(): {
  code: string;
  rawCode: string;
  shareLink: string;
} {
  let rawCode = sessionStorage.getItem(STORAGE_KEY);
  if (!rawCode) {
    rawCode = generateRawCode();
    sessionStorage.setItem(STORAGE_KEY, rawCode);
  }
  const code = `◈ ${rawCode}`;
  const shareLink = `${window.location.origin}/?c=${encodeURIComponent(rawCode)}`;
  return { code, rawCode, shareLink };
}
