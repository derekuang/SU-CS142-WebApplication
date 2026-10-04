import React from "react";

import { login } from "../../client/model/api/sessionApi.js";
import { createUser } from "../../client/model/api/userApi.js";
import getErrorMessage from "../../client/model/api/errors.js";
import LoginRegisterView from "../../client/views/LoginRegisterView.jsx";

import "./styles.css";

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
 * Define LoginRegister, a React component of CS142 Project 6.
 *
 * Controller: owns the form state and the login/registration submit handling,
 * delegating all rendering to LoginRegisterView.
 */
class LoginRegister extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: "login",
      loginName: "",
      password: "",
      loginError: "",
      registration: { ...emptyRegistration },
      registrationError: "",
      registrationSuccess: "",
    };
  }

  handleModeChange = (event, mode) => {
    this.setState({ mode });
  };

  handleLoginChange = (event) => {
    this.setState({ [event.target.name]: event.target.value, loginError: "" });
  };

  handleLoginSubmit = (event) => {
    event.preventDefault();
    const loginName = this.state.loginName.trim();
    const { password } = this.state;
    if (!loginName || !password) {
      return;
    }

    login(loginName, password)
      .then((user) => {
        this.setState({ loginError: "" });
        this.props.onLogin(user);
      })
      .catch((err) => {
        this.setState({
          loginError: getErrorMessage(
            err,
            "Invalid user name or password. Please try again.",
          ),
        });
      });
  };

  handleRegisterChange = (event) => {
    const { name, value } = event.target;
    this.setState((prevState) => ({
      registration: { ...prevState.registration, [name]: value },
      registrationError: "",
      registrationSuccess: "",
    }));
  };

  handleRegisterSubmit = (event) => {
    event.preventDefault();
    const registration = this.state.registration;
    const loginName = registration.login_name.trim();
    const password = registration.password;
    const confirmPassword = registration.confirmPassword;
    const firstName = registration.first_name.trim();
    const lastName = registration.last_name.trim();

    if (!loginName) {
      this.setRegistrationError("A user name is required.");
      return;
    }
    if (!firstName) {
      this.setRegistrationError("A first name is required.");
      return;
    }
    if (!lastName) {
      this.setRegistrationError("A last name is required.");
      return;
    }
    if (!password) {
      this.setRegistrationError("A password is required.");
      return;
    }
    if (password !== confirmPassword) {
      this.setRegistrationError("The two passwords do not match.");
      return;
    }

    createUser({
      login_name: loginName,
      password: password,
      first_name: firstName,
      last_name: lastName,
      location: registration.location,
      description: registration.description,
      occupation: registration.occupation,
    })
      .then(() => {
        this.setState({
          registration: { ...emptyRegistration },
          registrationError: "",
          registrationSuccess: "Registration succeeded. You can now log in.",
        });
      })
      .catch((err) => {
        this.setRegistrationError(
          getErrorMessage(err, "Registration failed. Please try again."),
        );
      });
  };

  setRegistrationError(message) {
    this.setState({ registrationError: message, registrationSuccess: "" });
  }

  render() {
    return (
      <LoginRegisterView
        mode={this.state.mode}
        onModeChange={this.handleModeChange}
        loginName={this.state.loginName}
        password={this.state.password}
        loginError={this.state.loginError}
        canLogin={Boolean(this.state.loginName.trim() && this.state.password)}
        onLoginChange={this.handleLoginChange}
        onLoginSubmit={this.handleLoginSubmit}
        registration={this.state.registration}
        registrationError={this.state.registrationError}
        registrationSuccess={this.state.registrationSuccess}
        onRegisterChange={this.handleRegisterChange}
        onRegisterSubmit={this.handleRegisterSubmit}
      />
    );
  }
}

export default LoginRegister;
