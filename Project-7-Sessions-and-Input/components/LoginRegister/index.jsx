import React from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";

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
 * Renders the login/registration view shown in the main content area while no
 * user is logged in. A tab switcher at the top lets the user choose between the
 * login form and the registration form, so only one is shown at a time. On
 * login submit it authenticates against /admin/login; on success it hands the
 * logged in user to the parent through `onLogin`. On registration submit it
 * validates the form locally and posts to /user, reporting a specific error or
 * a success message.
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

    axios
      .post("/admin/login", {
        login_name: loginName,
        password: password,
      })
      .then((response) => {
        this.setState({ loginError: "" });
        this.props.onLogin(response.data);
      })
      .catch((err) => {
        this.setState({
          loginError:
            (err.response && err.response.data) ||
            "Invalid user name or password. Please try again.",
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

    axios
      .post("/user", {
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
          (err.response && err.response.data) ||
            "Registration failed. Please try again.",
        );
      });
  };

  setRegistrationError(message) {
    this.setState({ registrationError: message, registrationSuccess: "" });
  }

  render() {
    const { mode } = this.state;

    return (
      <Box className="cs142-login-register">
        <Box className="cs142-login-register-tabs">
          <Tabs
            value={mode}
            onChange={this.handleModeChange}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Login" value="login" />
            <Tab label="Register" value="register" />
          </Tabs>
        </Box>
        <Box className="cs142-login-register-body">
          {mode === "login"
            ? this.renderLoginForm()
            : this.renderRegisterForm()}
        </Box>
      </Box>
    );
  }

  renderLoginForm() {
    const { loginName, password, loginError } = this.state;
    const canSubmit = Boolean(loginName.trim() && password);

    return (
      <Box
        component="form"
        onSubmit={this.handleLoginSubmit}
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Stack spacing={2} alignItems="center">
          <TextField
            name="loginName"
            label="User name"
            variant="outlined"
            value={loginName}
            onChange={this.handleLoginChange}
            autoFocus
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={this.handleLoginChange}
          />
          {loginError ? (
            <Typography variant="body2" color="error">
              {loginError}
            </Typography>
          ) : null}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!canSubmit}
          >
            Login
          </Button>
        </Stack>
      </Box>
    );
  }

  renderRegisterForm() {
    const { registration, registrationError, registrationSuccess } = this.state;

    return (
      <Box
        component="form"
        onSubmit={this.handleRegisterSubmit}
        noValidate
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Stack spacing={2} alignItems="center">
          <TextField
            name="login_name"
            label="User name"
            variant="outlined"
            required
            value={registration.login_name}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            variant="outlined"
            required
            value={registration.password}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="confirmPassword"
            label="Confirm password"
            type="password"
            variant="outlined"
            required
            value={registration.confirmPassword}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="first_name"
            label="First name"
            variant="outlined"
            required
            value={registration.first_name}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="last_name"
            label="Last name"
            variant="outlined"
            required
            value={registration.last_name}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="location"
            label="Location"
            variant="outlined"
            value={registration.location}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="description"
            label="Description"
            variant="outlined"
            value={registration.description}
            onChange={this.handleRegisterChange}
          />
          <TextField
            name="occupation"
            label="Occupation"
            variant="outlined"
            value={registration.occupation}
            onChange={this.handleRegisterChange}
          />
          {registrationError ? (
            <Alert severity="error">{registrationError}</Alert>
          ) : null}
          {registrationSuccess ? (
            <Alert severity="success">{registrationSuccess}</Alert>
          ) : null}
          <Button type="submit" variant="contained" color="primary">
            Register Me
          </Button>
        </Stack>
      </Box>
    );
  }
}

export default LoginRegister;
