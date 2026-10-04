import React from "react";
import ReactDOM from "react-dom";
import { Grid, Paper } from "@mui/material";
import { HashRouter, Redirect, Route, Switch } from "react-router-dom";

import { currentUser, logout } from "./client/model/api/sessionApi.js";
import { getState, setState, subscribe } from "./client/model/store/session.js";

import "./styles/main.css";
import TopBar from "./components/TopBar";
import UserDetail from "./components/UserDetail";
import UserList from "./components/UserList";
import UserPhotos from "./components/UserPhotos";
import LoginRegister from "./components/LoginRegister";

// Store actions shared with the child views. They live at module scope because
// they only talk to the session store and need no component instance.
function handleLogin(user) {
  setState({ user });
}

function handleLogout() {
  logout().catch(() => {});
  setState({ user: null });
}

function handlePhotoAdded() {
  // Bump the token so the photos view refetches and shows the new photo.
  setState({ photosRefreshToken: getState().photosRefreshToken + 1 });
}

// The login/register view is pure markup that only depends on the shared login
// action, so it needs no component instance.
function renderLoginForm() {
  return (
    <Grid item xs={12}>
      <Paper className="cs142-main-grid-item">
        <Switch>
          <Route path="/login-register">
            <LoginRegister onLogin={handleLogin} />
          </Route>
          <Redirect to="/login-register" />
        </Switch>
      </Paper>
    </Grid>
  );
}

class PhotoShare extends React.Component {
  constructor(props) {
    super(props);
    this.state = getState();
  }

  componentDidMount() {
    // Mirror the app state store so a change anywhere re-renders this shell.
    this.unsubscribeStore = subscribe((state) => {
      this.setState(state);
    });

    // Ask the server who is logged in from the session cookie so that a page
    // reload (e.g. F5) restores the login state instead of dropping the user
    // back to the login screen.
    currentUser()
      .then((user) => {
        setState({ user, checkingSession: false });
      })
      .catch(() => {
        setState({ user: null, checkingSession: false });
      });
  }

  componentWillUnmount() {
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
    }
  }

  isUserLoggedIn = () => {
    return this.state.user !== null;
  };

  render() {
    return (
      <HashRouter>
        <div>
          <Grid container spacing={2}>
            {this.renderTopBar()}
            <div className="cs142-main-topbar-buffer" />
            {this.renderMainContent()}
          </Grid>
        </div>
      </HashRouter>
    );
  }

  renderTopBar() {
    const loggedIn = this.isUserLoggedIn();

    return (
      <Grid item xs={12}>
        <TopBar
          content={
            loggedIn ? `Hi ${this.state.user.first_name}` : "Please Login"
          }
          user={this.state.user}
          userIsLoggedIn={loggedIn}
          onLogout={handleLogout}
          onPhotoAdded={handlePhotoAdded}
        />
      </Grid>
    );
  }

  /**
   * The main area has three cases: the session check is still in flight, the
   * user is logged in, or the user is logged out. Each case is rendered by its
   * own method below.
   */
  renderMainContent() {
    if (this.state.checkingSession) {
      // Leave the area empty so we don't flash the login form before we know
      // whether the session cookie is still valid.
      return null;
    }

    if (!this.isUserLoggedIn()) {
      return renderLoginForm();
    }

    return this.renderLoggedIn();
  }

  renderLoggedIn() {
    return (
      <React.Fragment>
        <Grid item xs={12} sm={3}>
          <Paper className="cs142-main-grid-item">
            <UserList />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={9}>
          <Paper className="cs142-main-grid-item">
            <Switch>
              <Route path="/users/:userId">
                <UserDetail />
              </Route>
              <Route path="/photos/:userId">
                <UserPhotos refreshToken={this.state.photosRefreshToken} />
              </Route>
              <Route path="/users" component={UserList} />
              <Redirect to={`/users/${this.state.user._id}`} />
            </Switch>
          </Paper>
        </Grid>
      </React.Fragment>
    );
  }
}

ReactDOM.render(<PhotoShare />, document.getElementById("photoshareapp"));
