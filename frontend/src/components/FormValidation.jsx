
import React, { useState } from "react";

// 입력값 검사용 함수
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateSignup(values) {
  if (!values.email.trim()) {
    return "이메일을 입력해 주세요.";
  }

  if (!validateEmail(values.email)) {
    return "올바른 이메일 주소를 입력해 주세요.";
  }

  if (!values.name.trim()) {
    return "사용자 이름을 입력해 주세요.";
  }

  if (!values.password) {
    return "비밀번호를 입력해 주세요.";
  }

  if (values.password.length < 8) {
    return "비밀번호는 8자 이상 입력해 주세요.";
  }

  if (!values.studentId.trim()) {
    return "학번을 입력해 주세요.";
  }

  if (!values.department) {
    return "학과를 선택해 주세요.";
  }

  return "";
}

export function validateLogin(email, password) {
  if (!email.trim()) {
    return "이메일을 입력해 주세요.";
  }

  if (!validateEmail(email)) {
    return "올바른 이메일 주소를 입력해 주세요.";
  }

  if (!password) {
    return "비밀번호를 입력해 주세요.";
  }

  return "";
}

export function validateSchedule(form, isUnavailable) {
  if (!form.subject.trim()) {
    return isUnavailable
      ? "일정 이름을 입력해 주세요."
      : "과목명을 입력해 주세요.";
  }

  if (!isUnavailable && !form.professor.trim()) {
    return "담당 교수를 입력해 주세요.";
  }

  if (!form.startTime || !form.endTime) {
    return "시작시간과 종료시간을 선택해 주세요.";
  }

  if (form.startTime >= form.endTime) {
    return "종료시간은 시작시간보다 늦어야 합니다.";
  }

  if (isUnavailable && !form.repeat && !form.date) {
    return "일회성 일정의 날짜를 선택해 주세요.";
  }

  return "";
}

export function validateTask(form) {
  if (!form.title.trim()) {
    return "과제명을 입력해 주세요.";
  }

  if (!form.date) {
    return "마감일을 선택해 주세요.";
  }

  return "";
}

export function validateGrade(form, gradeToPoint) {
  if (!form.semester) {
    return "학기를 선택해 주세요.";
  }

  if (!form.subject.trim()) {
    return "과목명을 입력해 주세요.";
  }

  const credit = Number(form.credit);

  if (!Number.isInteger(credit) || credit < 1 || credit > 4) {
    return "학점은 1~4학점 중에서 선택해 주세요.";
  }

  if (!Object.prototype.hasOwnProperty.call(
    gradeToPoint,
    form.grade
  )) {
    return "올바른 성적을 선택해 주세요.";
  }

  return "";
}

// 모든 화면에서 사용할 오류 메시지
export function ValidationMessage({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      style={{
        margin: "8px 0",
        padding: "10px 12px",
        borderRadius: "8px",
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#dc2626",
        fontSize: "13px",
        fontWeight: 500,
        lineHeight: 1.5,
      }}
    >
      {message}
    </p>
  );
}

// 입력 오류를 처리하는 공통 Form
export function ValidatedForm({
  validate,
  onValidSubmit,
  children,
  className,
  style,
}) {
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const errorMessage = validate();

    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    setError("");
    onValidSubmit(e);
  };

  return (
    <form
      className={className}
      style={style}
      onSubmit={handleSubmit}
      onChange={() => setError("")}
      noValidate
    >
      {children}

      <ValidationMessage message={error} />
    </form>
  );
}
