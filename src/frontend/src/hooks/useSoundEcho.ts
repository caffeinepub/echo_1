import { useCallback, useEffect, useRef, useState } from "react";

export function useSoundEcho() {
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [recorded, setRecorded] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setCountdown(5);
      setRecorded(false);

      let count = 5;
      timerRef.current = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          mr.stop();
          for (const t of stream.getTracks()) t.stop();
          setRecording(false);
          setRecorded(true);
          setTimeout(() => setRecorded(false), 3000);
        }
      }, 1000);
    } catch {
      // permission denied — silent fail
    }
  }, [recording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRef.current?.stop();
    };
  }, []);

  return { recording, countdown, recorded, startRecording };
}

export function useSoundEchoNotification() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const delay = 25000 + Math.random() * 10000;
    const t = setTimeout(() => {
      setVisible(true);
      const t2 = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(t2);
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return { visible };
}
