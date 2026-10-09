import React from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Snackbar,
  Toolbar,
  Typography,
} from "@mui/material";

const myName = "Derekuang";

/**
 * Presentational view for the top app bar.
 *
 * Receives everything it shows as props: the schema `version`, the login
 * `content`, whether the user is logged in, whether the Add Photo button should
 * appear, the advanced-features toggle, and the transient snackbar
 * `message`/`severity`. User interactions are delegated to the provided
 * callbacks; no data fetching happens here.
 */
function TopBarView({
  content,
  userIsLoggedIn,
  advancedFeatures,
  showAddPhoto,
  version,
  message,
  severity,
  onToggleAdvancedFeatures,
  onLogout,
  onFileSelected,
  onCloseMessage,
}) {
  return (
    <AppBar className="cs142-topbar-appBar" position="absolute">
      <Toolbar>
        <Box width="100%" display="flex" justifyContent="space-between">
          <Typography variant="h5" color="inherit">
            {`${myName} v${version}`}
          </Typography>
          <Box display="flex" alignItems="center">
            {userIsLoggedIn ? (
              <FormControlLabel
                sx={{ mr: 2 }}
                control={
                  (
                    <Checkbox
                      color="default"
                      sx={{ color: "inherit" }}
                      checked={Boolean(advancedFeatures)}
                      onChange={onToggleAdvancedFeatures}
                    />
                  )
                }
                label="Advanced Features"
              />
            ) : null}
            {showAddPhoto ? (
              <Button component="label" color="inherit" sx={{ mr: 2 }}>
                Add Photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onFileSelected}
                />
              </Button>
            ) : null}
            <Typography variant="h5" color="inherit">
              {userIsLoggedIn ? (
                content
              ) : (
                <Link
                  href="#/login-register"
                  color="inherit"
                  underline="hover"
                >
                  {content}
                </Link>
              )}
            </Typography>
            {userIsLoggedIn ? (
              <Button color="inherit" onClick={onLogout} sx={{ ml: 2 }}>
                Logout
              </Button>
            ) : null}
          </Box>
        </Box>
      </Toolbar>
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={onCloseMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={onCloseMessage}
          severity={severity || "info"}
          variant="filled"
        >
          {message}
        </Alert>
      </Snackbar>
    </AppBar>
  );
}

export default TopBarView;
