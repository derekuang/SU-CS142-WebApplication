import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes, Link } from "react-router-dom";

import Header from "./components/Header";
import Example from "./components/Example";
import States from "./components/States";

function App() {
  return (
    <HashRouter>
      <Header />
      <nav>
        <Link to="/example">Example</Link> |{" "}
        <Link to="/states">States</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Example />} />
        <Route path="/example" element={<Example />} />
        <Route path="/states" element={<States />} />
      </Routes>
    </HashRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("reactapp"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);