export async function hashVeilCode(
  code: string,
): Promise<{ hash: string; windowId: string }> {
  // Use a 60-second window (was 30s) and hash only the normalized code.
  // This means two users entering the same phrase within 60 seconds will always match,
  // regardless of which 30-second sub-window they happen to be in.
  const windowId = Math.floor(Date.now() / 60000).toString();
  const encoder = new TextEncoder();
  // Hash only the normalized code — NOT the windowId — so timing edge cases don't break matching.
  const data = encoder.encode(code.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return { hash, windowId };
}
