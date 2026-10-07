import React from "react";
import { withRouter } from "react-router-dom";

import getSchemaInfo from "../../client/model/api/testApi.js";
import { uploadPhoto } from "../../client/model/api/photoApi.js";
import getErrorMessage from "../../client/model/api/errors.js";
import TopBarView from "../../client/views/TopBarView.jsx";

import "./styles.css";

/**
 * Define TopBar, a React component of CS142 Project 5.
 *
 * Controller: owns the fetched schema version, the transient upload message,
 * and the Add Photo interaction, delegating all rendering to TopBarView.
 */
class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = { route: props.location.pathname };

    getSchemaInfo().then((info) => {
      this.setState({ version: info.__v });
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

    uploadPhoto(file)
      .then(() => {
        this.setState({ message: "Photo added.", severity: "success" });
        if (this.props.onPhotoAdded) {
          this.props.onPhotoAdded();
        }
      })
      .catch((err) => {
        this.setState({
          message: getErrorMessage(
            err,
            "Unable to add photo. Please try again.",
          ),
          severity: "error",
        });
      });
  };

  handleCloseMessage = () => {
    this.setState({ message: "" });
  };

  render() {
    return (
      <TopBarView
        content={this.props.content}
        userIsLoggedIn={this.props.userIsLoggedIn}
        showAddPhoto={this.isOwnPhotoPage()}
        version={this.state.version}
        message={this.state.message}
        severity={this.state.severity}
        onLogout={this.props.onLogout}
        onFileSelected={this.handleFileSelected}
        onCloseMessage={this.handleCloseMessage}
      />
    );
  }
}

export default withRouter(TopBar);
