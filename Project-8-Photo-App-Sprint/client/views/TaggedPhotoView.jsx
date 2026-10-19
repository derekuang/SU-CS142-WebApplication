import React from "react";
import { Box, IconButton, Link, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * A photo with its tag rectangles overlaid, plus the drag-to-select surface
 * used while tagging.
 *
 * The component renders only what it is given: `photo` (with `tags`), whether
 * tagging is active, whether a save is in flight, the current unsaved
 * selection, and callbacks for a completed selection or a request to remove an
 * existing tag. It performs no requests and owns only transient drag/hover
 * state.
 *
 * Coordinates are fractions of the photo's own dimensions, so the overlay is
 * independent of page scroll, window size, and the size the image happens to
 * be displayed at. The image is deliberately not cropped: the wrapper is sized
 * by the rendered image, which is what makes the percentage overlay exact.
 */

/**
 * Minimum rectangle size, as a fraction of the photo's width/height. Kept in
 * sync with `MIN_TAG_SIZE` in server/services/photoService.js: the client gives
 * immediate feedback and the server rejects a too-small tag sent directly.
 */
const MIN_TAG_SIZE = 0.02;

/**
 * Clamp a normalized coordinate to the photo's bounds.
 *
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Convert a pointer event into a 0-1 point relative to the overlay's rendered
 * box. Using `getBoundingClientRect` makes the result independent of the page's
 * scroll position; percentages then keep it correct at any image size.
 *
 * @param {object} event A React pointer event.
 * @param {HTMLElement} element The drag overlay.
 * @returns {{x: number, y: number}|null} Null before the image has a size.
 */
function pointFromEvent(event, element) {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return null;
  }
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

/**
 * Build the rectangle between two points, regardless of drag direction.
 *
 * @param {{x: number, y: number}} start
 * @param {{x: number, y: number}} end
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function rectBetween(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/**
 * Position a tag's rectangle from its stored fractions.
 *
 * @param {object} tag
 * @returns {object} MUI `sx` positioning properties.
 */
function tagBoxPosition(tag) {
  return {
    left: `${tag.x * 100}%`,
    top: `${tag.y * 100}%`,
    width: `${tag.width * 100}%`,
    height: `${tag.height * 100}%`,
  };
}

function TaggedPhotoView({
  photo,
  tagMode,
  busy,
  pendingRect,
  onSelectRect,
  onRequestDeleteTag,
}) {
  const [hoveredTagId, setHoveredTagId] = React.useState(null);
  const [dragRect, setDragRect] = React.useState(null);
  const dragStart = React.useRef(null);

  // Leaving (or entering) tag mode must discard any drag in progress so a
  // switch can never leave a stale rectangle or hover label behind.
  React.useEffect(() => {
    dragStart.current = null;
    setDragRect(null);
    setHoveredTagId(null);
  }, [tagMode]);

  const handlePointerDown = (event) => {
    if (!tagMode || busy) {
      return;
    }
    const point = pointFromEvent(event, event.currentTarget);
    if (!point) {
      return;
    }

    event.preventDefault();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragStart.current = point;
    setDragRect({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event) => {
    if (!dragStart.current) {
      return;
    }
    const point = pointFromEvent(event, event.currentTarget);
    if (!point) {
      return;
    }
    setDragRect(rectBetween(dragStart.current, point));
  };

  const handlePointerUp = (event) => {
    if (!dragStart.current) {
      return;
    }

    const start = dragStart.current;
    const end = pointFromEvent(event, event.currentTarget);
    dragStart.current = null;
    setDragRect(null);

    if (
      event.currentTarget.hasPointerCapture &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!end) {
      return;
    }

    const rect = rectBetween(start, end);
    if (rect.width >= MIN_TAG_SIZE && rect.height >= MIN_TAG_SIZE) {
      onSelectRect(rect);
    } else if (rect.width > 0 || rect.height > 0) {
      // A deliberate drag that is too small: let the parent explain why
      // nothing was selected. A plain click stays silent.
      onSelectRect(null);
    }
  };

  const handlePointerCancel = () => {
    dragStart.current = null;
    setDragRect(null);
  };

  const tags = photo.tags || [];
  const selection = dragRect || pendingRect;

  return (
    <Box sx={{ textAlign: "center", lineHeight: 0 }}>
      <Box
        sx={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
          lineHeight: 0,
          userSelect: "none",
        }}
      >
        <Box
          component="img"
          alt={photo.file_name}
          src={`images/${photo.file_name}`}
          draggable={false}
          sx={{
            display: "block",
            width: "auto",
            height: "auto",
            maxWidth: "100%",
          }}
        />

        {tags.map((tag) => {
          const isHovered = hoveredTagId === tag._id;
          // Keep the name chip inside the photo's bounds where possible.
          const alignRight = tag.x + tag.width > 0.65;
          const alignBottom = tag.y + tag.height > 0.85;

          return (
            <Box
              key={tag._id}
              sx={{
                position: "absolute",
                ...tagBoxPosition(tag),
                border: "2px solid",
                borderColor: "warning.main",
                bgcolor: "rgba(255, 193, 7, 0.12)",
                boxSizing: "border-box",
                zIndex: 1,
                pointerEvents: tagMode ? "none" : "auto",
              }}
              onMouseEnter={() => setHoveredTagId(tag._id)}
              onMouseLeave={() => {
                setHoveredTagId((current) => {
                  return current === tag._id ? null : current;
                });
              }}
            >
              {isHovered ? (
                <Box
                  sx={{
                    position: "absolute",
                    top: alignBottom ? "auto" : 0,
                    bottom: alignBottom ? 0 : "auto",
                    left: alignRight ? "auto" : 0,
                    right: alignRight ? 0 : "auto",
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
                  }}
                >
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
              ) : null}
            </Box>
          );
        })}

        {selection ? (
          <Box
            sx={{
              position: "absolute",
              ...tagBoxPosition(selection),
              border: "2px dashed",
              borderColor: "primary.main",
              bgcolor: "rgba(25, 118, 210, 0.12)",
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        ) : null}

        <Box
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            pointerEvents: tagMode && !busy ? "auto" : "none",
            cursor: tagMode && !busy ? "crosshair" : "default",
            touchAction: tagMode && !busy ? "none" : "auto",
          }}
        />
      </Box>
    </Box>
  );
}

export default TaggedPhotoView;
