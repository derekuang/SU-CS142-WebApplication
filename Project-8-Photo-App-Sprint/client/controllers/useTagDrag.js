import { useEffect, useRef, useState } from "react";

/**
 * Drag-to-select logic for the photo tagging overlay.
 *
 * The hook owns the transient rectangle and the pointer lifecycle, but no
 * rendering and no API calls. Its handlers must be attached to the transparent
 * overlay element that exactly covers the photo: every coordinate is computed
 * from `event.currentTarget.getBoundingClientRect()`, so page scroll and the
 * displayed image size cancel out.
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
 * Own the transient drag state for one photo's tagging overlay.
 *
 * @param {object} options
 * @param {boolean} options.tagMode Whether the user is currently tagging.
 * @param {boolean} options.busy Whether a save is in flight (disables drawing).
 * @param {function(object|null): void} options.onSelectRect Called on pointer
 *   up with the normalized rectangle, or null when the drag was too small.
 * @returns {{dragRect: object|null, dragHandlers: object}} The live preview
 *   rectangle and the pointer handlers to attach to the overlay.
 */
function useTagDrag({ tagMode, busy, onSelectRect }) {
  const [dragRect, setDragRect] = useState(null);
  const dragStart = useRef(null);

  // Leaving tag mode, or a save starting, must discard any drag in progress so
  // a switch can never leave a stale rectangle behind.
  useEffect(() => {
    dragStart.current = null;
    setDragRect(null);
  }, [tagMode, busy]);

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
      // A deliberate drag that is too small: let the caller explain why
      // nothing was selected. A plain click stays silent.
      onSelectRect(null);
    }
  };

  const handlePointerCancel = () => {
    dragStart.current = null;
    setDragRect(null);
  };

  return {
    dragRect,
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}

export default useTagDrag;
