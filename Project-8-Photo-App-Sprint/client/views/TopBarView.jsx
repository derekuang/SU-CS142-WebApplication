import React, { useRef, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  Divider,
  Link,
  Menu,
  MenuItem,
  Snackbar,
  Toolbar,
  Typography,
} from "@mui/material";

const myName = "Derekuang";

/**
 * Presentational view for the top app bar.
 *
 * Receives everything it shows as props: the schema `version`, the login
 * `content`, whether the user is logged in, whether the Add Photo action should
 * appear, the advanced-features toggle, and the transient snackbar
 * `message`/`severity`. User interactions are delegated to the provided
 * callbacks; no data fetching happens here.
 *
 * When logged in, the right side collapses into a greeting button that opens a
 * dropdown menu. Ordinary actions (advanced features, activities, add photo)
 * come first, session/account actions are grouped at the bottom, and the
 * destructive "Delete Account" action is last and rendered in the error color.
 * Menu open state and the hidden file input are local, ephemeral UI concerns.
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
  onRequestDeleteAccount,
  onFileSelected,
  onCloseMessage,
}) {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const fileInputRef = useRef(null);

  const menuOpen = Boolean(menuAnchorEl);

  const openMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const closeMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleAddPhotoClick = () => {
    closeMenu();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLogoutClick = () => {
    closeMenu();
    onLogout();
  };

  const handleDeleteAccountClick = () => {
    closeMenu();
    onRequestDeleteAccount();
  };

  return (
    <AppBar className="cs142-topbar-appBar" position="absolute">
      <Toolbar>
        <Box
          width="100%"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" color="inherit">
            {`${myName} v${version}`}
          </Typography>
          <Box display="flex" alignItems="center">
            {userIsLoggedIn ? (
              <React.Fragment>
                <Button
                  color="inherit"
                  onClick={openMenu}
                  aria-haspopup="true"
                  aria-expanded={menuOpen ? "true" : undefined}
                  sx={{ fontSize: "1.5rem", textTransform: "none" }}
                >
                  {content}
                  <Box component="span" sx={{ ml: 0.5 }}>
                    &#9662;
                  </Box>
                </Button>
                <Menu
                  anchorEl={menuAnchorEl}
                  open={menuOpen}
                  onClose={closeMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem onClick={onToggleAdvancedFeatures}>
                    <Checkbox
                      checked={Boolean(advancedFeatures)}
                      disableRipple
                      tabIndex={-1}
                      size="small"
                      sx={{ p: 0, mr: 1, pointerEvents: "none" }}
                    />
                    Advanced Features
                  </MenuItem>
                  <MenuItem
                    component="a"
                    href="#/activities"
                    onClick={closeMenu}
                  >
                    Activities
                  </MenuItem>
                  {showAddPhoto ? (
                    <MenuItem onClick={handleAddPhotoClick}>Add Photo</MenuItem>
                  ) : null}
                  <Divider />
                  <MenuItem onClick={handleLogoutClick}>Logout</MenuItem>
                  <MenuItem
                    onClick={handleDeleteAccountClick}
                    sx={{ color: "error.main" }}
                  >
                    Delete Account
                  </MenuItem>
                </Menu>
              </React.Fragment>
            ) : (
              <Typography variant="h5" color="inherit">
                <Link
                  href="#/login-register"
                  color="inherit"
                  underline="hover"
                >
                  {content}
                </Link>
              </Typography>
            )}
          </Box>
        </Box>
      </Toolbar>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileSelected}
      />
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
