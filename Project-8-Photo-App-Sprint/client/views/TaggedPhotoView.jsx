import React from "react";
import { Box, IconButton, Link, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import useTagDrag from "../controllers/useTagDrag.js";

/**
 * A photo with its tag rectangles overlaid, plus the drag-to-select surface
 * used while tagging.
 *
 * The component renders only what it is given: `photo` (with `tags`), whether
 * tagging is active, whether a save is in flight, the current unsaved
 * selection, and callbacks for a completed selection or a request to remove an
 * existing tag. It performs no requests. Drag state lives in `useTagDrag`, and
 * each tag's hover state lives in `TagRectangle`.
 *
 * Coordinates are fractions of the photo's own dimensions, so the overlay is
 * independent of page scroll, window size, and the size the image happens to
 * be displayed at. The image is deliberately not cropped: the wrapper is sized
 * by the rendered image, which is what makes the percentage overlay exact.
 */

/**
 * Stacking order for the three overlay layers. The tag boxes sit below the
 * unsaved selection, and the transparent drag surface sits above both.
 */
const Z_INDEX = {
  tag: 1,
  selection: 2,
  drag: 3,
};

/**
 * When a tag is close enough to the right/bottom edge, its name chip flips to
 * the other side so the chip stays inside the photo.
 */
const CHIP_FLIP_X = 0.65;
const CHIP_FLIP_Y = 0.85;

/**
 * Static visual styles. Geometry that comes from tag data (left/top/width/
 * height) is applied through `style` so the data is visibly separate from the
 * design tokens.
 */
const styles = {
  stage: {
    textAlign: "center",
    lineHeight: 0,
  },
  frame: {
    position: "relative",
    display: "inline-block",
    maxWidth: "100%",
    lineHeight: 0,
    userSelect: "none",
  },
  image: {
    display: "block",
    width: "auto",
    height: "auto",
    maxWidth: "100%",
  },
  tagBox: {
    position: "absolute",
    border: "2px solid",
    borderColor: "primary.main",
    bgcolor: "transparent",
    boxSizing: "border-box",
    zIndex: Z_INDEX.tag,
  },
  tagBoxPassive: {
    pointerEvents: "none",
  },
  selection: {
    position: "absolute",
    border: "2px dashed",
    borderColor: "primary.main",
    bgcolor: "rgba(25, 118, 210, 0.12)",
    boxSizing: "border-box",
    pointerEvents: "none",
    zIndex: Z_INDEX.selection,
  },
  chip: {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    gap: 0.5,
    whiteSpace: "nowrap",
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1,
    px: 0.75,
    py: 0.25,
    boxShadow: 1,
    zIndex: 2,
  },
  dragSurface: {
    position: "absolute",
    inset: 0,
    zIndex: Z_INDEX.drag,
  },
  dragSurfaceActive: {
    pointerEvents: "auto",
    cursor: "crosshair",
    touchAction: "none",
  },
  dragSurfaceIdle: {
    pointerEvents: "none",
    cursor: "default",
    touchAction: "auto",
  },
};

/**
 * Position a tag's rectangle from its stored fractions.
 *
 * @param {object} tag
 * @returns {object} Inline positioning properties.
 */
function tagBoxPosition(tag) {
  return {
    left: `${tag.x * 100}%`,
    top: `${tag.y * 100}%`,
    width: `${tag.width * 100}%`,
    height: `${tag.height * 100}%`,
  };
}

/**
 * The dashed preview of the rectangle currently being drawn or awaiting save.
 */
function SelectionPreview({ rect }) {
  return <Box sx={styles.selection} style={tagBoxPosition(rect)} />;
}

/**
 * The hover label for one tag: the tagged user's name (a link to their detail
 * view) plus the optional remove control. The parent decides whether the
 * remove control is allowed by supplying `tag.canDelete`.
 */
function TagNameChip({ tag, onRequestDeleteTag }) {
  const alignRight = tag.x + tag.width > CHIP_FLIP_X;
  const alignBottom = tag.y + tag.height > CHIP_FLIP_Y;
  const chipPosition = {
    top: alignBottom ? "auto" : 0,
    bottom: alignBottom ? 0 : "auto",
    left: alignRight ? "auto" : 0,
    right: alignRight ? 0 : "auto",
  };

  return (
    <Box sx={styles.chip} style={chipPosition}>
      {tag.user ? (
        <Link
          href={`#/users/${tag.user._id}`}
          color="inherit"
          underline="hover"
          sx={{
            fontWeight: "bold",
            fontSize: "0.8rem",
            lineHeight: 1.4,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {`${tag.user.first_name} ${tag.user.last_name}`}
        </Link>
      ) : (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.4 }}
        >
          Unknown user
        </Typography>
      )}
      {tag.canDelete ? (
        <Tooltip title="Remove tag">
          <IconButton
            size="small"
            aria-label="Remove tag"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRequestDeleteTag(tag);
            }}
            sx={{ p: 0.25 }}
          >
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}

/**
 * One stored tag: its rectangle, hover handling, and the name chip. Hover state
 * is local because only the tag under the pointer needs to react; in tag mode
 * the box stops receiving pointer events so the drag surface stays usable.
 */
function TagRectangle({ tag, tagMode, onRequestDeleteTag }) {
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    if (tagMode) {
      setHovered(false);
    }
  }, [tagMode]);

  return (
    <Box
      sx={[styles.tagBox, tagMode && styles.tagBoxPassive]}
      style={tagBoxPosition(tag)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && !tagMode ? (
        <TagNameChip tag={tag} onRequestDeleteTag={onRequestDeleteTag} />
      ) : null}
    </Box>
  );
}

/**
 * The transparent layer that owns pointer events for drawing a new rectangle.
 * It is inert in view mode so the tag boxes below can handle hover and clicks.
 */
function DragSurface({ interactive, ...handlers }) {
  return (
    <Box
      {...handlers}
      sx={[
        styles.dragSurface,
        interactive ? styles.dragSurfaceActive : styles.dragSurfaceIdle,
      ]}
    />
  );
}

function TaggedPhotoView({
  photo,
  tagMode,
  busy,
  pendingRect,
  onSelectRect,
  onRequestDeleteTag,
}) {
  const { dragRect, dragHandlers } = useTagDrag({
    tagMode,
    busy,
    onSelectRect,
  });
  const tags = photo.tags || [];
  const selection = dragRect || pendingRect;
  const canDraw = tagMode && !busy;

  return (
    <Box sx={styles.stage}>
      <Box sx={styles.frame}>
        <Box
          component="img"
          alt={photo.file_name}
          src={`images/${photo.file_name}`}
          draggable={false}
          sx={styles.image}
        />

        {tags.map((tag) => (
          <TagRectangle
            key={tag._id}
            tag={tag}
            tagMode={tagMode}
            onRequestDeleteTag={onRequestDeleteTag}
          />
        ))}

        {selection ? <SelectionPreview rect={selection} /> : null}

        <DragSurface interactive={canDraw} {...dragHandlers} />
      </Box>
    </Box>
  );
}

export default TaggedPhotoView;
