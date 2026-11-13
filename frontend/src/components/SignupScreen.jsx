
import React from "react";
import {
  ValidatedForm,
  validateSignup,
} from "./FormValidation";

export function SignupScreen(props) {
  const {
    currentView,
    setCurrentView,
    signupValues,
    setSignupValues,
    handleSignupSubmit,
    departments,
    message,
  } = props;

  if (currentView !== "signup") return null;

  const updateField = (field, value) => {
    setSignupValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <section
      className="anima-signup-card"
      aria-labelledby="signup-title"
    >
      <h1
        id="signup-title"
        className="anima-signup-title"
      >
        회원가입
      </h1>

      <ValidatedForm
        className="anima-form"
        validate={() => validateSignup(signupValues)}
        onValidSubmit={handleSignupSubmit}
      >
        <div className="signup-input-wrap top-129">
          <input
            type="email"
            value={signupValues.email}
            onChange={(e) =>
              updateField("email", e.target.value)
            }
            placeholder="이메일(ID)"
            className="signup-input"
          />
        </div>

        <div className="signup-input-wrap top-236">
          <input
            type="text"
            value={signupValues.name}
            onChange={(e) =>
              updateField("name", e.target.value)
            }
            placeholder="사용자 이름"
            className="signup-input"
          />
        </div>

        <div className="signup-input-wrap top-347">
          <input
            type="password"
            value={signupValues.password}
            onChange={(e) =>
              updateField("password", e.target.value)
            }
            placeholder="비밀번호 (8자 이상)"
            className="signup-input"
          />
        </div>

        <div className="signup-half-wrap top-460 left-368">
          <input
            type="text"
            value={signupValues.studentId}
            onChange={(e) =>
              updateField("studentId", e.target.value)
            }
            placeholder="학번"
            className="signup-input"
          />
        </div>

        <div className="signup-half-wrap top-456 left-615">
          <select
            value={signupValues.department}
            onChange={(e) =>
              updateField("department", e.target.value)
            }
            className="signup-input signup-select"
          >
            {departments.map((dept) => (
              <option
                key={dept.value}
                value={dept.value}
              >
                {dept.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="signup-submit-btn"
        >
          회원가입
        </button>

        {message && (
          <p className="signup-message">
            {message}
          </p>
        )}
      </ValidatedForm>

      <footer className="signup-footer">
        <span>이미 계정이 있으신가요?</span>

        <button
          type="button"
          className="anima-link-btn"
          onClick={() => setCurrentView("login")}
        >
          로그인
        </button>
      </footer>
    </section>
  );
}
