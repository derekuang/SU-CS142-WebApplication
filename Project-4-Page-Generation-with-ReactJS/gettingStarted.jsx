import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/main.css";

import Header from "./components/Header";
import Example from "./components/Example";

const root = ReactDOM.createRoot(document.getElementById("reactapp"));
root.render(
  <React.StrictMode>
    <Header />
    <Example />
  </React.StrictMode>);
