import { useCallback, useEffect, useState } from "react";

const QUESTIONS = [
  "Bu gece ne kayboldu?",
  "Hangi ses seni terk etti?",
  "Bugün neyi gömmek istedin?",
  "Seni en çok ne yordu?",
  "Hangi kelime yetmedi?",
  "Bugün hangi kapı kapandı?",
  "Ne söylemek isteyip sustun?",
];

const STORAGE_KEY = "echo_dark_poll";

interface DayPoll {
  date: string;
  answers: string[];
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadPoll(): DayPoll {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: DayPoll = raw
      ? (JSON.parse(raw) as DayPoll)
      : { date: "", answers: [] };
    if (data.date !== getTodayKey()) {
      return { date: getTodayKey(), answers: [] };
    }
    return data;
  } catch {
    return { date: getTodayKey(), answers: [] };
  }
}

export function useDarkPoll() {
  const todayKey = getTodayKey();
  const dayIndex = new Date().getDate() % QUESTIONS.length;
  const question = QUESTIONS[dayIndex];

  const [poll, setPoll] = useState<DayPoll>(loadPoll);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(poll));
  }, [poll]);

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!answer.trim()) return;
      setPoll((prev) => ({
        date: todayKey,
        answers: [...prev.answers, answer.trim()],
      }));
    },
    [todayKey],
  );

  const collectiveEcho =
    poll.answers.length >= 3
      ? poll.answers
          .slice(0, 5)
          .map((a) => a.split(" ").slice(0, 3).join(" "))
          .join(" · ")
      : null;

  return { question, answers: poll.answers, submitAnswer, collectiveEcho };
}
