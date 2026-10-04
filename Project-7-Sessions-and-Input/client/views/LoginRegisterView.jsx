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

/**
 * Presentational views for logging in and registering.
 *
 * They receive all form values, messages, and handlers as props and perform no
 * data fetching themselves. The `mode` prop selects which form is shown.
 */

function LoginForm({
  loginName,
  password,
  loginError,
  canSubmit,
  onChange,
  onSubmit,
}) {
  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Stack spacing={2} alignItems="center">
        <TextField
          name="loginName"
          label="User name"
          variant="outlined"
          value={loginName}
          onChange={onChange}
          autoFocus
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          variant="outlined"
          value={password}
          onChange={onChange}
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

function RegisterForm({ registration, error, success, onChange, onSubmit }) {
  return (
    <Box
      component="form"
      onSubmit={onSubmit}
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
          onChange={onChange}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          variant="outlined"
          required
          value={registration.password}
          onChange={onChange}
        />
        <TextField
          name="confirmPassword"
          label="Confirm password"
          type="password"
          variant="outlined"
          required
          value={registration.confirmPassword}
          onChange={onChange}
        />
        <TextField
          name="first_name"
          label="First name"
          variant="outlined"
          required
          value={registration.first_name}
          onChange={onChange}
        />
        <TextField
          name="last_name"
          label="Last name"
          variant="outlined"
          required
          value={registration.last_name}
          onChange={onChange}
        />
        <TextField
          name="location"
          label="Location"
          variant="outlined"
          value={registration.location}
          onChange={onChange}
        />
        <TextField
          name="description"
          label="Description"
          variant="outlined"
          value={registration.description}
          onChange={onChange}
        />
        <TextField
          name="occupation"
          label="Occupation"
          variant="outlined"
          value={registration.occupation}
          onChange={onChange}
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}
        <Button type="submit" variant="contained" color="primary">
          Register Me
        </Button>
      </Stack>
    </Box>
  );
}

function LoginRegisterView({
  mode,
  onModeChange,
  loginName,
  password,
  loginError,
  canLogin,
  onLoginChange,
  onLoginSubmit,
  registration,
  registrationError,
  registrationSuccess,
  onRegisterChange,
  onRegisterSubmit,
}) {
  return (
    <Box className="cs142-login-register">
      <Box className="cs142-login-register-tabs">
        <Tabs
          value={mode}
          onChange={onModeChange}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Login" value="login" />
          <Tab label="Register" value="register" />
        </Tabs>
      </Box>
      <Box className="cs142-login-register-body">
        {mode === "login" ? (
          <LoginForm
            loginName={loginName}
            password={password}
            loginError={loginError}
            canSubmit={canLogin}
            onChange={onLoginChange}
            onSubmit={onLoginSubmit}
          />
        ) : (
          <RegisterForm
            registration={registration}
            error={registrationError}
            success={registrationSuccess}
            onChange={onRegisterChange}
            onSubmit={onRegisterSubmit}
          />
        )}
      </Box>
    </Box>
  );
}

export default LoginRegisterView;
