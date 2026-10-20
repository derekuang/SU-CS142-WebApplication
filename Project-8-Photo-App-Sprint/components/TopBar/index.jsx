import React from "react";
import { withRouter } from "react-router-dom";

import useTopBar from "../../client/controllers/useTopBar.js";
import useUploadPhoto from "../../client/controllers/useUploadPhoto.js";
import useDeleteAccount from "../../client/controllers/useDeleteAccount.js";
import TopBarView from "../../client/views/TopBarView.jsx";
import UploadPhotoDialogView from "../../client/views/UploadPhotoDialogView.jsx";
import DeleteAccountDialogView from "../../client/views/DeleteAccountDialogView.jsx";

import "./styles.css";

/**
 * Define TopBar, a React component of CS142 Project 8.
 *
 * Thin controller: `useTopBar` provides the bar's route-aware data (schema
 * version, snackbar, Add Photo visibility) and `useUploadPhoto` owns the Add
 * Photo dialog. Selecting a file opens the dialog instead of uploading
 * straight away, so the uploader can optionally restrict who sees the photo.
 */
function TopBar(props) {
  const {
    version,
    message,
    severity,
    showAddPhoto,
    notify,
    onCloseMessage,
  } = useTopBar(props.location.pathname, props.user);

  const upload = useUploadPhoto({
    onUploaded: props.onPhotoAdded,
    onMessage: notify,
  });

  const deleteAccountFlow = useDeleteAccount(props.onAccountDeleted);

  return (
    <React.Fragment>
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
        onRequestDeleteAccount={deleteAccountFlow.onRequest}
        onFileSelected={upload.onFileSelected}
        onCloseMessage={onCloseMessage}
      />
      <UploadPhotoDialogView
        open={upload.open}
        fileName={upload.fileName}
        restricted={upload.restricted}
        selectedIds={upload.selectedIds}
        options={upload.options}
        error={upload.error}
        onToggleRestricted={upload.onToggleRestricted}
        onChangeSelected={upload.onChangeSelected}
        onConfirm={upload.onConfirm}
        onClose={upload.onClose}
      />
      <DeleteAccountDialogView
        open={deleteAccountFlow.open}
        busy={deleteAccountFlow.busy}
        error={deleteAccountFlow.error}
        onConfirm={deleteAccountFlow.onConfirm}
        onCancel={deleteAccountFlow.onCancel}
      />
    </React.Fragment>
  );
}

export default withRouter(TopBar);
