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
 * data fetching themselves. The `mode` prop selects which form is shown; `login`
 * and `registration` are the two form bundles produced by the controller.
 */

function LoginForm({ loginName, password, error, canSubmit, onChange, onSubmit }) {
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

function RegisterForm({ values, error, success, onChange, onSubmit }) {
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
          value={values.login_name}
          onChange={onChange}
        />
        <TextField
          name="password"
          label="Password"
          type="password"
          variant="outlined"
          required
          value={values.password}
          onChange={onChange}
        />
        <TextField
          name="confirmPassword"
          label="Confirm password"
          type="password"
          variant="outlined"
          required
          value={values.confirmPassword}
          onChange={onChange}
        />
        <TextField
          name="first_name"
          label="First name"
          variant="outlined"
          required
          value={values.first_name}
          onChange={onChange}
        />
        <TextField
          name="last_name"
          label="Last name"
          variant="outlined"
          required
          value={values.last_name}
          onChange={onChange}
        />
        <TextField
          name="location"
          label="Location"
          variant="outlined"
          value={values.location}
          onChange={onChange}
        />
        <TextField
          name="description"
          label="Description"
          variant="outlined"
          value={values.description}
          onChange={onChange}
        />
        <TextField
          name="occupation"
          label="Occupation"
          variant="outlined"
          value={values.occupation}
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

function LoginRegisterView({ mode, onModeChange, login, registration }) {
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
          <LoginForm {...login} />
        ) : (
          <RegisterForm {...registration} />
        )}
      </Box>
    </Box>
  );
}

export default LoginRegisterView;
