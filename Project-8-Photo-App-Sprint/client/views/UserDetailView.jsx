import React from "react";
import {
  Button,
  Stack,
  Divider,
  Link,
  List,
  ListItem,
  Typography,
  Box,
} from "@mui/material";

import humanize from "../utils/humanize.js";

/**
 * Presentational view for a single user's profile.
 *
 * Renders only what it is given: `user` (or a loading placeholder while it is
 * still undefined), `usage`, the server-computed summary of the user's most
 * recent and most commented photo, and `mentions`, the photos whose comments
 * @mention this user. It performs no data fetching and no selection of its own.
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

/**
 * One photo that mentions this user: a small thumbnail that opens the photo in
 * its owner's photo view, and a link to the owner's profile. The owner may be
 * null if that account was removed, in which case only the thumbnail's plain
 * text fallback is shown.
 */
function MentionItem({ photo, onOpenStepper }) {
  const owner = photo.owner;
  const ownerName = owner
    ? `${owner.first_name} ${owner.last_name}`
    : "Unknown user";

  return (
    <ListItem>
      <Link
        href={owner ? `#/photos/${owner._id}/${photo._id}` : undefined}
        onClick={owner ? onOpenStepper : undefined}
        underline="none"
        sx={{ mr: 2 }}
      >
        <Box
          component="img"
          alt={photo.file_name}
          src={`images/${photo.file_name}`}
          sx={{
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: 1,
            display: "block",
          }}
        />
      </Link>
      <Stack>
        {owner ? (
          <Link
            href={`#/users/${owner._id}`}
            color="inherit"
            underline="hover"
            sx={{ fontWeight: "bold" }}
          >
            {ownerName}
          </Link>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {ownerName}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {humanize(photo.date_time)}
        </Typography>
      </Stack>
    </ListItem>
  );
}

/**
 * The photos whose comments @mention this user, as reported by the server.
 * Shows a placeholder while the list is still loading and a plain message when
 * the user has never been mentioned.
 */
function MentionsSection({ mentions, onOpenStepper }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ width: "100%" }}>
      <Typography variant="h6">Mentions</Typography>
      {!mentions ? (
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      ) : mentions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No mentions yet
        </Typography>
      ) : (
        <List sx={{ width: "100%" }}>
          {mentions.map((photo) => (
            <React.Fragment key={photo._id}>
              <MentionItem photo={photo} onOpenStepper={onOpenStepper} />
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Stack>
  );
}

function UserDetailView({ user, usage, mentions, onOpenStepper }) {
  if (!user) {
    return <Box>Loading...</Box>;
  }

  return (
    <Stack
      divider={<Divider sx={{ width: "90%" }} />}
      alignItems="center"
      spacing={2}
      sx={{
        width: "100%",
        maxHeight: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
        pr: 1,
      }}
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

      <MentionsSection mentions={mentions} onOpenStepper={onOpenStepper} />
    </Stack>
  );
}

export default UserDetailView;
