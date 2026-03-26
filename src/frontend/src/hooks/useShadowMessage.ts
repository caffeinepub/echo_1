interface ShadowEntry {
  id: string;
  text: string;
}

const STORAGE_KEY = "echo_shadow_pool";

function loadPool(): ShadowEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ShadowEntry[]) : [];
  } catch {
    return [];
  }
}

function savePool(pool: ShadowEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pool));
}

export function useShadowMessage() {
  function add(text: string): void {
    const pool = loadPool();
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString();
    pool.push({ id, text });
    savePool(pool);
  }

  function readNext(): string | null {
    const pool = loadPool();
    if (pool.length === 0) return null;
    const [first, ...rest] = pool;
    savePool(rest);
    return first.text;
  }

  return { add, readNext };
}
