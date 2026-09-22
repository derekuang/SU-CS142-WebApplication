import React from "react";
import ReactDOM from "react-dom";
import { Grid, Paper } from "@mui/material";
import { HashRouter, Redirect, Route, Switch } from "react-router-dom";
import axios from "axios";

import "./styles/main.css";
import TopBar from "./components/TopBar";
import UserDetail from "./components/UserDetail";
import UserList from "./components/UserList";
import UserPhotos from "./components/UserPhotos";
import LoginRegister from "./components/LoginRegister";

class PhotoShare extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      checkingSession: true
    };
  }

  componentDidMount() {
    // Ask the server who is logged in from the session cookie so that a page
    // reload (e.g. F5) restores the login state instead of dropping the user
    // back to the login screen.
    axios
      .get("/admin/currentUser")
      .then((response) => {
        this.setState({ user: response.data, checkingSession: false });
      })
      .catch(() => {
        this.setState({ user: null, checkingSession: false });
      });
  }

  isUserLoggedIn = () => {
    return this.state.user !== null;
  };

  handleLogin = (user) => {
    this.setState({ user });
  };

  handleLogout = () => {
    axios.post("/admin/logout").catch(() => {});
    this.setState({ user: null });
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
          userIsLoggedIn={loggedIn}
          onLogout={this.handleLogout}
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
      return this.renderLoginForm();
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
                <UserPhotos />
              </Route>
              <Route path="/users" component={UserList} />
              <Redirect to={`/users/${this.state.user._id}`} />
            </Switch>
          </Paper>
        </Grid>
      </React.Fragment>
    );
  }

  renderLoginForm() {
    return (
      <Grid item xs={12}>
        <Paper className="cs142-main-grid-item">
          <Switch>
            <Route path="/login-register">
              <LoginRegister onLogin={this.handleLogin} />
            </Route>
            <Redirect to="/login-register" />
          </Switch>
        </Paper>
      </Grid>
    );
  }
}

ReactDOM.render(<PhotoShare />, document.getElementById("photoshareapp"));
