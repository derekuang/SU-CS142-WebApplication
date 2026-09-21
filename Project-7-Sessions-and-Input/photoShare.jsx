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
      user: null
    };
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
    const loggedIn = this.isUserLoggedIn();

    return (
      <HashRouter>
        <div>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TopBar
                content={
                  loggedIn ? `Hi ${this.state.user.first_name}` : "Please Login"
                }
                userIsLoggedIn={loggedIn}
                onLogout={this.handleLogout}
              />
            </Grid>
            <div className="cs142-main-topbar-buffer" />
            {loggedIn ? (
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
            ) : (
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
            )}
          </Grid>
        </div>
      </HashRouter>
    );
  }
}

ReactDOM.render(<PhotoShare />, document.getElementById("photoshareapp"));
