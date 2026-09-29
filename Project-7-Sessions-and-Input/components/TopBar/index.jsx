import React from "react";
import { withRouter } from "react-router-dom";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Link,
  Snackbar,
  Toolbar,
  Typography,
} from "@mui/material";
import axios from "axios";

import "./styles.css";

const myName = "Derekuang";

/**
 * Define TopBar, a React component of CS142 Project 5.
 */
class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { route: props.location.pathname };

    const promise = axios.get("/test/info");
    promise.then((response) => {
      this.setState({ version: response.data.__v });
    });
  }

  componentDidUpdate() {
    if (this.props.location.pathname !== this.state.route) {
      this.setState({ route: this.props.location.pathname });
    }
  }

  /**
   * The Add Photo button only makes sense on the logged in user's own photo
   * page, i.e. when the route is /photos/:userId and userId is that user.
   */
  isOwnPhotoPage() {
    const { user, location } = this.props;
    if (!user) {
      return false;
    }
    const match = location.pathname.match(/^\/photos\/([^/]+)$/);
    return Boolean(match) && match[1] === user._id;
  }

  handleFileSelected = (event) => {
    const file = event.target.files[0];
    // Reset the input so picking the same file again still fires onChange.
    event.target.value = "";

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("uploadedphoto", file);

    axios
      .post("/photos/new", formData)
      .then(() => {
        this.setState({ message: "Photo added.", severity: "success" });
        if (this.props.onPhotoAdded) {
          this.props.onPhotoAdded();
        }
      })
      .catch((err) => {
        this.setState({
          message:
            (err.response && err.response.data) ||
            "Unable to add photo. Please try again.",
          severity: "error",
        });
      });
  };

  handleCloseMessage = () => {
    this.setState({ message: "" });
  };

  render() {
    return (
      <AppBar className="cs142-topbar-appBar" position="absolute">
        <Toolbar>
          <Box width="100%" display="flex" justifyContent="space-between">
            <Typography variant="h5" color="inherit">
              {`${myName} v${this.state.version}`}
            </Typography>
            <Box display="flex" alignItems="center">
              {this.isOwnPhotoPage() ? (
                <Button component="label" color="inherit" sx={{ mr: 2 }}>
                  Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={this.handleFileSelected}
                  />
                </Button>
              ) : null}
              <Typography variant="h5" color="inherit">
                {this.props.userIsLoggedIn ? (
                  this.props.content
                ) : (
                  <Link
                    href="#/login-register"
                    color="inherit"
                    underline="hover"
                  >
                    {this.props.content}
                  </Link>
                )}
              </Typography>
              {this.props.userIsLoggedIn ? (
                <Button
                  color="inherit"
                  onClick={this.props.onLogout}
                  sx={{ ml: 2 }}
                >
                  Logout
                </Button>
              ) : null}
            </Box>
          </Box>
        </Toolbar>
        <Snackbar
          open={Boolean(this.state.message)}
          autoHideDuration={4000}
          onClose={this.handleCloseMessage}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={this.handleCloseMessage}
            severity={this.state.severity || "info"}
            variant="filled"
          >
            {this.state.message}
          </Alert>
        </Snackbar>
      </AppBar>
    );
  }
}

export default withRouter(TopBar);
