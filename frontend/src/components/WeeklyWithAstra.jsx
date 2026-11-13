import React, { useEffect, useRef, useState } from "react";
import { Weekly } from "./Weekly";
import { AstraSyncButton } from "./AstraSyncButton";
import "./astra-sync.css";

/**
 * WEEKLY의 기존 레이아웃과 수동 추가/수정 기능은 그대로 유지한다.
 * ASTRA 동기화는 별도의 툴바로 제공한다.
 */
export function WeeklyWithAstra(props) {
  const { activeMenu, onAstraSynced } = props;
  const refreshRef = useRef(onAstraSynced);
  const [loadError, setLoadError] = useState("");

  // App에서 전달되는 함수는 렌더마다 새로 만들어질 수 있으므로 ref에 보관한다.
  refreshRef.current = onAstraSynced;

  // WEEKLY 화면에 들어올 때 서버에 저장된 수업을 가져온다.
  useEffect(() => {
    if (activeMenu !== "WEEKLY") return;
    let cancelled = false;
    setLoadError("");
    Promise.resolve()
      .then(() => refreshRef.current?.())
      .catch((error) => {
        if (!cancelled) {
          console.error("시간표 초기 조회 실패:", error);
          setLoadError("저장된 시간표를 불러오지 못했습니다. 백엔드 서버를 확인해 주세요.");
        }
      });
    return () => { cancelled = true; };
  }, [activeMenu]);

  if (activeMenu !== "WEEKLY") return null;

  return (
    <>
      <div className="astra-weekly-toolbar">
        <AstraSyncButton onSynced={onAstraSynced} />
        {loadError && <p className="astra-sync-message error" role="alert">{loadError}</p>}
      </div>
      <Weekly {...props} />
    </>
  );
}
