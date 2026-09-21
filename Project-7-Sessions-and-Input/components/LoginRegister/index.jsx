import React from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import axios from "axios";

import "./styles.css";

/**
 * Define LoginRegister, a React component of CS142 Project 6.
 *
 * Renders the login form shown in the main content area while no user is
 * logged in. On submit it authenticates against /admin/login; on success it
 * hands the logged in user to the parent through `onLogin`, and on failure it
 * shows an error so the user can retry.
 */
class LoginRegister extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loginName: "", password: "", error: "" };
  }

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.value, error: "" });
  };

  handleSubmit = (event) => {
    event.preventDefault();
    const loginName = this.state.loginName.trim();
    const { password } = this.state;
    if (!loginName || !password) {
      return;
    }

    axios
      .post("/admin/login", {
        parameter_name: loginName,
        parameter_password: password,
      })
      .then((response) => {
        this.setState({ error: "" });
        this.props.onLogin(response.data);
      })
      .catch(() => {
        this.setState({
          error: "Invalid user name or password. Please try again.",
        });
      });
  };

  render() {
    const { loginName, password, error } = this.state;
    const canSubmit = Boolean(loginName.trim() && password);

    return (
      <Box
        component="form"
        className="cs142-login-register"
        onSubmit={this.handleSubmit}
      >
        <Stack spacing={2} alignItems="center">
          <TextField
            name="loginName"
            label="User name"
            variant="outlined"
            value={loginName}
            onChange={this.handleChange}
            autoFocus
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={this.handleChange}
          />
          {error ? (
            <Typography variant="body2" color="error">
              {error}
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
}

export default LoginRegister;
