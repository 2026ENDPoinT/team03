
import React, { useEffect, useState } from "react";
import { Home } from "./Home";

const API_URL = "http://localhost:3000/api/gpa";

export function HomeWithServerGpa(props) {
  const [gpaData, setGpaData] = useState({
    cumulativeGPA: "—",
    totalCredits: "—",
  });

  useEffect(() => {
    if (props.activeMenu !== "HOME") return;

    const controller = new AbortController();

    async function loadGpa() {
      try {
        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("GPA 조회 실패");
        }

        const data = await response.json();

        // 백엔드 GPA 응답:
        // { cumulative: { totalCredits, gpa }, semesters: {} }
        const cumulative = data.cumulative;

        if (!cumulative) {
          throw new Error("GPA 응답 형식 오류");
        }

        setGpaData({
          cumulativeGPA:
            cumulative.gpa === null ||
            cumulative.gpa === undefined
              ? "—"
              : Number(cumulative.gpa).toFixed(2),

          totalCredits: cumulative.totalCredits ?? 0,
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("HOME GPA 불러오기 실패:", error);

        setGpaData({
          cumulativeGPA: "연결 오류",
          totalCredits: "—",
        });
      }
    }

    loadGpa();

    return () => controller.abort();
  }, [props.activeMenu]);

  return (
    <Home
      {...props}
      cumulativeGPA={gpaData.cumulativeGPA}
      totalCredits={gpaData.totalCredits}
    />
  );
}
