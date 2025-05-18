import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import Header from "./components/Header";
import States from "./components/States";

const root = ReactDOM.createRoot(document.getElementById("reactapp"));
root.render(
  <StrictMode>
    <Header />
    <States />
  </StrictMode>
);
