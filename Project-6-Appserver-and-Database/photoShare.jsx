import React from "react";
import ReactDOM from "react-dom";
import { Grid, Paper } from "@mui/material";
import { HashRouter, Route, Switch } from "react-router-dom";

import "./styles/main.css";
import TopBar from "./components/TopBar";
import UserDetail from "./components/UserDetail";
import UserList from "./components/UserList";
import UserPhotos from "./components/UserPhotos";

class PhotoShare extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      content: "Home",
    };
  }

  changeContent = (newContext, name) => {
    this.setState({ content: newContext + (name && name) });
  };

  render() {
    return (
      <HashRouter>
        <div>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TopBar content={this.state.content} />
            </Grid>
            <div className="cs142-main-topbar-buffer" />
            <Grid item xs={12} sm={3}>
              <Paper className="cs142-main-grid-item">
                <UserList />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Paper className="cs142-main-grid-item">
                <Switch>
                  <Route
                    path="/users/:userId"
                    render={(props) => (
                      <UserDetail
                        {...props}
                        changeContent={this.changeContent}
                      />
                    )}
                  />
                  <Route
                    path="/photos/:userId"
                    render={(props) => (
                      <UserPhotos
                        {...props}
                        changeContent={this.changeContent}
                      />
                    )}
                  />
                  <Route path="/users" component={UserList} />
                </Switch>
              </Paper>
            </Grid>
          </Grid>
        </div>
      </HashRouter>
    );
  }
}

ReactDOM.render(<PhotoShare />, document.getElementById("photoshareapp"));
