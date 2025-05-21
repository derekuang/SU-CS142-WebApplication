import React, { StrictMode, useState } from "react";
import ReactDOM from "react-dom/client";

import Header from "./components/Header";
import Example from "./components/Example";
import States from "./components/States";

const OPTIONS = {
  example: {
    key: "example",
    component: <Example />
  },
  states: {
    key: "states",
    component: <States />
  }
};

function getNextView(view) {
  return view === OPTIONS.example ? OPTIONS.states : OPTIONS.example;
}

function App(props) {
  const [view, setView] = useState(props.view);
  let nextView = getNextView(view);

  function switchView() {
    setView(nextView);
    nextView = getNextView(view);
  }

  return (
    <>
      <button onClick={() => switchView()}>
        Switch to {nextView.key}
      </button>
      {view.component};
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