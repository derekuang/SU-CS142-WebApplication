import React from "react";
import { withRouter } from "react-router-dom";
import { AppBar, Box, Toolbar, Typography } from "@mui/material";

import "./styles.css";
import fetchModel from "../../lib/fetchModelData";

const myName = "Derekuang";

/**
 * Define TopBar, a React component of CS142 Project 5.
 */
class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { route: props.location.pathname };

    const promise = fetchModel("/test/info");
    promise.then((response) => {
      this.setState({ version: response.data.__v });
    });
  }

  componentDidUpdate() {
    if (this.props.location.pathname !== this.state.route) {
      this.setState({ route: this.props.location.pathname });
    }
  }

  render() {
    return (
      <AppBar className="cs142-topbar-appBar" position="absolute">
        <Toolbar>
          <Box width="100%" display="flex" justifyContent="space-between">
            <Typography variant="h5" color="inherit">
              {`${myName} v${this.state.version}`}
            </Typography>
            <Typography variant="h5" color="inherit">
              {this.props.content}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
    );
  }
}

export default withRouter(TopBar);
