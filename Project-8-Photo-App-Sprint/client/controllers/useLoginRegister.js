import { useCallback, useState } from "react";

import { login } from "../model/api/sessionApi.js";
import { createUser } from "../model/api/userApi.js";
import getErrorMessage from "../model/api/errors.js";

// The empty shape of the registration form. Keeping it in one place lets us
// both initialize the form and clear every field after a successful submit.
const emptyRegistration = {
  login_name: "",
  password: "",
  confirmPassword: "",
  first_name: "",
  last_name: "",
  location: "",
  description: "",
  occupation: "",
};

/**
 * Controller for the login/register view.
 *
 * Owns which form is shown (`mode`), the login form's fields and error, and the
 * registration form's fields, error, and success message. On a successful login
 * it calls `onLogin(user)` so the app shell can store the session; a successful
 * registration just clears the form and shows a success message.
 *
 * Returns the `mode`/`onModeChange` pair plus two form bundles for
 * LoginRegisterView: `login` and `registration`.
 */
function useLoginRegister(onLogin) {
  const [mode, setMode] = useState("login");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registration, setRegistration] = useState({ ...emptyRegistration });
  const [registrationError, setRegistrationError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState("");

  const onModeChange = useCallback((event, newMode) => {
    setMode(newMode);
  }, []);

  const onLoginChange = useCallback((event) => {
    const { name, value } = event.target;
    if (name === "loginName") {
      setLoginName(value);
    } else {
      setPassword(value);
    }
    setLoginError("");
  }, []);

  const onLoginSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const trimmedName = loginName.trim();
      if (!trimmedName || !password) {
        return;
      }

      login(trimmedName, password)
        .then((user) => {
          setLoginError("");
          onLogin(user);
        })
        .catch((err) => {
          setLoginError(
            getErrorMessage(
              err,
              "Invalid user name or password. Please try again.",
            ),
          );
        });
    },
    [loginName, password, onLogin],
  );

  const onRegisterChange = useCallback((event) => {
    const { name, value } = event.target;
    setRegistration((prev) => ({ ...prev, [name]: value }));
    setRegistrationError("");
    setRegistrationSuccess("");
  }, []);

  const failRegistration = useCallback((message) => {
    setRegistrationError(message);
    setRegistrationSuccess("");
  }, []);

  const onRegisterSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const newLoginName = registration.login_name.trim();
      const newPassword = registration.password;
      const confirmPassword = registration.confirmPassword;
      const firstName = registration.first_name.trim();
      const lastName = registration.last_name.trim();

      if (!newLoginName) {
        failRegistration("A user name is required.");
        return;
      }
      if (!firstName) {
        failRegistration("A first name is required.");
        return;
      }
      if (!lastName) {
        failRegistration("A last name is required.");
        return;
      }
      if (!newPassword) {
        failRegistration("A password is required.");
        return;
      }
      if (newPassword !== confirmPassword) {
        failRegistration("The two passwords do not match.");
        return;
      }

      createUser({
        login_name: newLoginName,
        password: newPassword,
        first_name: firstName,
        last_name: lastName,
        location: registration.location,
        description: registration.description,
        occupation: registration.occupation,
      })
        .then(() => {
          setRegistration({ ...emptyRegistration });
          setRegistrationError("");
          setRegistrationSuccess("Registration succeeded. You can now log in.");
        })
        .catch((err) => {
          failRegistration(
            getErrorMessage(err, "Registration failed. Please try again."),
          );
        });
    },
    [registration, failRegistration],
  );

  return {
    mode,
    onModeChange,
    login: {
      loginName,
      password,
      error: loginError,
      canSubmit: Boolean(loginName.trim() && password),
      onChange: onLoginChange,
      onSubmit: onLoginSubmit,
    },
    registration: {
      values: registration,
      error: registrationError,
      success: registrationSuccess,
      onChange: onRegisterChange,
      onSubmit: onRegisterSubmit,
    },
  };
}

export default useLoginRegister;
