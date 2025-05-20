import React, { StrictMode, useState } from "react";
import ReactDOM from "react-dom/client";

import Header from "./components/Header";
import Example from "./components/Example";
import States from "./components/States";

const OPTIONS = {
  example: <Example />,
  states: <States />
};

function App(props) {
  const [view, setView] = useState(props.view);
  let otherView = view === OPTIONS.example ? OPTIONS.states : OPTIONS.example;

  function switchView() {
    setView(otherView);
    otherView = view === OPTIONS.example ? OPTIONS.states : OPTIONS.example;
  }

  return (
    <>
      <button onClick={() => switchView()}>
        Switch to {view === OPTIONS.example ? "States" : "Example"}
      </button>
      {view};
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("reactapp"));
root.render(
  <StrictMode>
    <Header />
    <App view={OPTIONS.example} />
  </StrictMode>
);