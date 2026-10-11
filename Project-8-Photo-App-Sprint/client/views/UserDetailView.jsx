import React from "react";
import { Button, Stack, Divider, Link, Typography, Box } from "@mui/material";

import humanize from "../utils/humanize.js";

/**
 * Presentational view for a single user's profile.
 *
 * Renders only what it is given: `user` (or a loading placeholder while it is
 * still undefined) and `usage`, the server-computed summary of the user's most
 * recent and most commented photo. It performs no data fetching and no
 * selection of its own.
 *
 * Each usage thumbnail links to that photo's position in the photos view;
 * `onOpenStepper` lets the shell turn on the photo stepper so the linked photo
 * opens directly in it.
 */

/**
 * One usage block: a heading, a small clickable thumbnail, and a caption
 * (upload time or comment count). Shows a placeholder while the usage summary
 * is still loading and when the user has no photos.
 */
function UsageSection({ title, photo, caption, userId, onOpenStepper, loading }) {
  return (
    <Stack alignItems="center" spacing={1}>
      <Typography variant="h6">{title}</Typography>
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      ) : photo ? (
        <Link
          href={`#/photos/${userId}/${photo._id}`}
          onClick={onOpenStepper}
          underline="none"
        >
          <Box
            component="img"
            alt={photo.file_name}
            src={`images/${photo.file_name}`}
            sx={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: 1,
              display: "block",
            }}
          />
        </Link>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No photos yet
        </Typography>
      )}
      {caption ? (
        <Typography variant="body2" color="text.secondary">
          {caption}
        </Typography>
      ) : null}
    </Stack>
  );
}

function UserDetailView({ user, usage, onOpenStepper }) {
  if (!user) {
    return <Box>Loading...</Box>;
  }

  return (
    <Stack
      divider={<Divider sx={{ width: "90%" }} />}
      alignItems="center"
      spacing={2}
    >
      <Typography variant="h3">
        {`${user.first_name} ${user.last_name}`}
      </Typography>
      <Typography variant="h5">Occupation: {user.occupation}</Typography>
      <Typography variant="h5">Location: {user.location}</Typography>
      <Typography variant="body1">
        {/* eslint-disable-next-line react/no-danger */}
        Quote: <span dangerouslySetInnerHTML={{ __html: user.description }} />
      </Typography>
      <Button variant="outlined">
        <Link href={`#/photos/${user._id}`}>Photos</Link>
      </Button>

      <UsageSection
        title="Recent Upload"
        loading={!usage}
        photo={usage && usage.recentPhoto}
        caption={
          usage && usage.recentPhoto
            ? `Uploaded ${humanize(usage.recentPhoto.date_time)}`
            : null
        }
        userId={user._id}
        onOpenStepper={onOpenStepper}
      />

      <UsageSection
        title="Most Commented"
        loading={!usage}
        photo={usage && usage.mostCommentedPhoto}
        caption={
          usage && usage.mostCommentedPhoto
            ? `${usage.mostCommentedPhoto.commentCount} comments`
            : null
        }
        userId={user._id}
        onOpenStepper={onOpenStepper}
      />
    </Stack>
  );
}

export default UserDetailView;
