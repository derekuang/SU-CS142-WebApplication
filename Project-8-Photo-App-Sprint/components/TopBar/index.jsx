import React from "react";
import { withRouter } from "react-router-dom";

import useTopBar from "../../client/controllers/useTopBar.js";
import TopBarView from "../../client/views/TopBarView.jsx";

import "./styles.css";

/**
 * Define TopBar, a React component of CS142 Project 8.
 *
 * Thin controller: reads the current route and hands it, the logged in user,
 * and the photo-added callback to useTopBar, then passes everything the view
 * needs as props.
 */
function TopBar(props) {
  const {
    version,
    message,
    severity,
    showAddPhoto,
    onFileSelected,
    onCloseMessage,
  } = useTopBar(props.location.pathname, props.user, props.onPhotoAdded);

  return (
    <TopBarView
      content={props.content}
      userIsLoggedIn={props.userIsLoggedIn}
      advancedFeatures={props.advancedFeatures}
      showAddPhoto={showAddPhoto}
      version={version}
      message={message}
      severity={severity}
      onToggleAdvancedFeatures={props.onToggleAdvancedFeatures}
      onLogout={props.onLogout}
      onFileSelected={onFileSelected}
      onCloseMessage={onCloseMessage}
    />
  );
}

export default withRouter(TopBar);
