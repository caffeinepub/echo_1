import { useEffect, useState } from "react";

const CURSE_KEY = "echo_cursed";

export function useCurse() {
  const [isCursed, setIsCursed] = useState(false);

  useEffect(() => {
    const val = localStorage.getItem(CURSE_KEY);
    if (val === "1") {
      localStorage.removeItem(CURSE_KEY);
      setIsCursed(true);
    }
  }, []);

  const leaveCurse = () => {
    localStorage.setItem(CURSE_KEY, "1");
  };

  return { isCursed, leaveCurse };
}
