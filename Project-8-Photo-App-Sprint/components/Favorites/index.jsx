import React from "react";

import useFavorites from "../../client/controllers/useFavorites.js";
import FavoritesView from "../../client/views/FavoritesView.jsx";

import "./styles.css";

/**
 * Define Favorites, a React component of CS142 Project 8.
 *
 * Thin controller: `useFavorites` fetches the logged in user's favorites and
 * owns removal, which is handed to the presentational view.
 */
function Favorites() {
  const { favorites, error, onRemove } = useFavorites();

  return (
    <FavoritesView favorites={favorites} error={error} onRemove={onRemove} />
  );
}

export default Favorites;
