
import React, { useEffect, useRef, useState } from "react";

const TIMEOUT_MS = 45000;

export function AstraSyncButton({ onSynced }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const pendingRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeout);
        window.removeEventListener(
          "message",
          pendingRef.current.listener
        );
        pendingRef.current = null;
      }
    };
  }, []);

  const startSync = () => {
    if (pendingRef.current) return;

    if (!window.crypto?.randomUUID) {
      setStatus("error");
      setMessage("localhost에서 웹사이트를 실행해 주세요.");
      return;
    }

    const requestId = window.crypto.randomUUID();

    console.log("[ASTRA] 동기화 요청 시작:", requestId);

    setStatus("loading");
    setMessage("ASTRA 시간표를 동기화하는 중입니다.");

    const cleanup = () => {
      const pending = pendingRef.current;

      if (!pending || pending.requestId !== requestId) {
        return;
      }

      clearTimeout(pending.timeout);
      window.removeEventListener(
        "message",
        pending.listener
      );
      pendingRef.current = null;
    };

    const listener = async (event) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data;

      if (!data || data.type !== "ASTRA_SYNC_RESULT") {
        return;
      }

      console.log("[ASTRA] 응답 수신:", data);
      console.log(
        "[ASTRA] 요청 ID 일치:",
        data.requestId === requestId
      );

      if (data.requestId !== requestId) {
        return;
      }

      // 응답을 받았으므로 시간 초과 타이머 종료
      clearTimeout(pendingRef.current?.timeout);

      if (data.response?.ok !== true) {
        console.error(
          "[ASTRA] 확장 프로그램 처리 실패:",
          data.response
        );

        cleanup();
        setStatus("error");
        setMessage(
          data.response?.message ||
          "동기화에 실패했습니다. ASTRA 로그인 및 확장 프로그램을 확인해 주세요."
        );
        return;
      }

      try {
        console.log(
          "[ASTRA] 서버 시간표 새로고침 시작"
        );

        if (typeof onSynced !== "function") {
          throw new Error(
            "onSynced 함수가 전달되지 않았습니다."
          );
        }

        await onSynced();

        console.log(
          "[ASTRA] 서버 시간표 새로고침 완료"
        );

        const result = data.response.result || {};
        const added = Number(result.added ?? 0);
        const skipped = Number(result.skipped ?? 0);

        setStatus("success");

        if (added === 0 && skipped > 0) {
          setMessage(
            `시간표 동기화가 완료되었습니다. 이미 등록된 수업은 중복 추가하지 않았습니다. (추가 ${added}개, 중복 제외 ${skipped}개)`
          );
        } else {
          setMessage(
            `시간표 동기화가 완료되었습니다. (추가 ${added}개, 중복 제외 ${skipped}개)`
          );
        }
      } catch (error) {
        console.error(
          "[ASTRA] 시간표 새로고침 오류:",
          error
        );

        setStatus("error");
        setMessage(
          "ASTRA 동기화 응답은 받았지만 시간표를 다시 불러오지 못했습니다. 백엔드 연결을 확인해 주세요."
        );
      } finally {
        cleanup();
      }
    };

    const timeout = window.setTimeout(() => {
      console.error(
        "[ASTRA] 응답 시간 초과:",
        requestId
      );

      cleanup();
      setStatus("error");
      setMessage(
        "동기화에 실패했습니다. ASTRA 로그인 및 확장 프로그램을 확인해 주세요. (응답 시간 초과)"
      );
    }, TIMEOUT_MS);

    pendingRef.current = {
      requestId,
      timeout,
      listener,
    };

    window.addEventListener("message", listener);

    try {
      window.postMessage(
        {
          type: "ASTRA_SYNC_REQUEST",
          requestId,
          mode: "weekly",
        },
        window.location.origin
      );

      console.log(
        "[ASTRA] 메시지 전송 완료:",
        requestId
      );
    } catch (error) {
      console.error(
        "[ASTRA] 요청 전송 실패:",
        error
      );

      cleanup();
      setStatus("error");
      setMessage("동기화 요청 전송에 실패했습니다.");
    }
  };

  return (
    <div className="astra-sync-control">
      <button
        type="button"
        className="weekly-action-btn"
        onClick={startSync}
        disabled={status === "loading"}
        aria-busy={status === "loading"}
      >
        {status === "loading"
          ? "ASTRA 동기화 중..."
          : "ASTRA 시간표 동기화"}
      </button>

      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`astra-sync-message ${status}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
