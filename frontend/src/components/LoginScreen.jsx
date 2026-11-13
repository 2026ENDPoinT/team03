
import React from "react";

import {
  ValidatedForm,
  validateLogin,
} from "./FormValidation";

export function LoginScreen(props) {
  const {
    currentView,
    setCurrentView,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleLoginSubmit,
  } = props;

  if (currentView !== "login") {
    return null;
  }

  return (
    <section
      className="anima-card"
      aria-labelledby="login-title"
    >
      <h1
        id="login-title"
        className="anima-title"
      >
        학점 관리
      </h1>

      <ValidatedForm
        className="anima-form"
        validate={() =>
          validateLogin(loginEmail, loginPassword)
        }
        onValidSubmit={handleLoginSubmit}
      >
        <label className="anima-label-email">
          이메일
        </label>

        <input
          type="email"
          value={loginEmail}
          onChange={(e) =>
            setLoginEmail(e.target.value)
          }
          className="anima-input-email"
        />

        <label className="anima-label-password">
          비밀번호
        </label>

        <input
          type="password"
          value={loginPassword}
          onChange={(e) =>
            setLoginPassword(e.target.value)
          }
          className="anima-input-password"
        />

        <button
          type="submit"
          className="anima-submit-btn"
        >
          로그인
        </button>
      </ValidatedForm>

      <p className="anima-footer-text">
        아직 계정이 없으신가요?
      </p>

      <button
        type="button"
        className="anima-link-btn"
        style={{
          position: "absolute",
          top: "487px",
          left: "290px",
        }}
        onClick={() => setCurrentView("signup")}
      >
        회원가입
      </button>
    </section>
  );
}
