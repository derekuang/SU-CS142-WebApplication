import React from "react";

import useLoginRegister from "../../client/controllers/useLoginRegister.js";
import LoginRegisterView from "../../client/views/LoginRegisterView.jsx";

import "./styles.css";

/**
 * Define LoginRegister, a React component of CS142 Project 8.
 *
 * Thin controller: hands the login callback to useLoginRegister and passes the
 * resulting mode plus the login/registration bundles to the presentational view.
 */
function LoginRegister(props) {
  const { mode, onModeChange, login, registration } = useLoginRegister(
    props.onLogin,
  );

  return (
    <LoginRegisterView
      mode={mode}
      onModeChange={onModeChange}
      login={login}
      registration={registration}
    />
  );
}

export default LoginRegister;
