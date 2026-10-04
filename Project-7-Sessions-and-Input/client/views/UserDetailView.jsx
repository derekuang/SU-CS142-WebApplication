import React from "react";
import { Button, Stack, Divider, Link, Typography, Box } from "@mui/material";

/**
 * Presentational view for a single user's profile.
 *
 * Renders only what it is given: `user` (or a loading placeholder while it is
 * still undefined). It performs no data fetching.
 */
function UserDetailView({ user }) {
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
    </Stack>
  );
}

export default UserDetailView;
