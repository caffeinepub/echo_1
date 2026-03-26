import { useCallback, useEffect, useRef, useState } from "react";
import { hashVeilCode } from "../utils/veilHash";

export type VeilPhase = "idle" | "searching" | "consent" | "connected" | "void";

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 3 * 60 * 1000;
const SEARCH_TIMEOUT_MS = 60 * 1000;
const CONSENT_TIMEOUT_MS = 30 * 1000;
const VOID_RESET_DELAY = 3000;

interface VeilActor {
  submit_veil_hash(
    hash: string,
    windowId: string,
  ): Promise<{ token: string; signal: string }>;
  poll_veil(token: string): Promise<{ phase: string; channelCode: string }>;
  veil_consent(token: string, accept: boolean): Promise<string>;
}

interface UseEchoVeilResult {
  phase: VeilPhase;
  voidMsg: string;
  channelCode: string | null;
  consentCountdown: number;
  cooldownLeft: number;
  submit: (code: string) => Promise<void>;
  accept: () => void;
  reject: () => void;
  abort: () => void;
  reset: () => void;
}

export function useEchoVeil(actor: VeilActor | null): UseEchoVeilResult {
  const [phase, setPhase] = useState<VeilPhase>("idle");
  const [voidMsg, setVoidMsg] = useState("no stable connection");
  const [channelCode, setChannelCode] = useState<string | null>(null);
  const [consentCountdown, setConsentCountdown] = useState(
    CONSENT_TIMEOUT_MS / 1000,
  );
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const tokenRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const attemptsRef = useRef(0);
  const cooldownEndRef = useRef(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (consentIntervalRef.current) {
      clearInterval(consentIntervalRef.current);
      consentIntervalRef.current = null;
    }
  }, []);

  const goVoid = useCallback(
    (msg: string) => {
      clearPolling();
      setVoidMsg(msg);
      setPhase("void");
      setTimeout(() => {
        setPhase("idle");
        tokenRef.current = null;
        setChannelCode(null);
      }, VOID_RESET_DELAY);
    },
    [clearPolling],
  );

  const startPolling = useCallback(
    (token: string) => {
      if (!actor) return;
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await actor.poll_veil(token);
          if (status.phase === "consent") {
            clearPolling();
            setPhase("consent");
            setConsentCountdown(CONSENT_TIMEOUT_MS / 1000);
            // consent countdown
            consentIntervalRef.current = setInterval(() => {
              setConsentCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(consentIntervalRef.current!);
                  goVoid("signal dissolved");
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else if (status.phase === "connected") {
            clearPolling();
            setChannelCode(status.channelCode);
            setPhase("connected");
          } else if (status.phase === "void") {
            goVoid("no stable connection");
          }
        } catch {
          // ignore transient errors
        }
      }, 2000);
    },
    [actor, clearPolling, goVoid],
  );

  const submit = useCallback(
    async (code: string) => {
      if (!actor) return;
      if (cooldownEndRef.current > Date.now()) return;

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        cooldownEndRef.current = Date.now() + COOLDOWN_MS;
        attemptsRef.current = 0;
        const end = cooldownEndRef.current;
        setCooldownLeft(Math.ceil((end - Date.now()) / 1000));
        cooldownIntervalRef.current = setInterval(() => {
          const left = Math.ceil((end - Date.now()) / 1000);
          if (left <= 0) {
            clearInterval(cooldownIntervalRef.current!);
            setCooldownLeft(0);
          } else {
            setCooldownLeft(left);
          }
        }, 1000);
        goVoid("signal unclear");
        return;
      }

      try {
        const { hash, windowId } = await hashVeilCode(code);
        const result = await actor.submit_veil_hash(hash, windowId);
        tokenRef.current = result.token;

        if (result.signal === "frequency detected") {
          setPhase("consent");
          setConsentCountdown(CONSENT_TIMEOUT_MS / 1000);
          consentIntervalRef.current = setInterval(() => {
            setConsentCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(consentIntervalRef.current!);
                goVoid("signal dissolved");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setPhase("searching");
          startPolling(result.token);
          searchTimeoutRef.current = setTimeout(() => {
            goVoid("frequency lost");
          }, SEARCH_TIMEOUT_MS);
        }
      } catch {
        goVoid("signal unclear");
      }
    },
    [actor, goVoid, startPolling],
  );

  const accept = useCallback(async () => {
    if (!actor || !tokenRef.current) return;
    clearPolling();
    try {
      const response = await actor.veil_consent(tokenRef.current, true);
      if (response === "signal dissolved") {
        goVoid("signal dissolved");
      } else {
        // "awaiting resonance" or "channel forming" — poll for connected
        startPolling(tokenRef.current);
      }
    } catch {
      goVoid("signal unclear");
    }
  }, [actor, clearPolling, goVoid, startPolling]);

  const reject = useCallback(async () => {
    if (!actor || !tokenRef.current) return;
    clearPolling();
    try {
      await actor.veil_consent(tokenRef.current, false);
    } catch {
      // ignore
    }
    goVoid("signal dissolved");
  }, [actor, clearPolling, goVoid]);

  const abort = useCallback(() => {
    clearPolling();
    goVoid("signal dissolved");
  }, [clearPolling, goVoid]);

  const reset = useCallback(() => {
    clearPolling();
    setPhase("idle");
    tokenRef.current = null;
    setChannelCode(null);
  }, [clearPolling]);

  useEffect(() => {
    return () => {
      clearPolling();
      if (cooldownIntervalRef.current)
        clearInterval(cooldownIntervalRef.current);
    };
  }, [clearPolling]);

  return {
    phase,
    voidMsg,
    channelCode,
    consentCountdown,
    cooldownLeft,
    submit,
    accept,
    reject,
    abort,
    reset,
  };
}
