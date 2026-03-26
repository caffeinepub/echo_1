const KEY = "echo_last_word";

export function useLastWord() {
  const lastWord = localStorage.getItem(KEY) ?? "";

  const saveLastWord = (word: string) => {
    localStorage.setItem(KEY, word);
  };

  const clearLastWord = () => {
    localStorage.removeItem(KEY);
  };

  return { lastWord, saveLastWord, clearLastWord };
}
