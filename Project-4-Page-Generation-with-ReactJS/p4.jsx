import React, { StrictMode, useState } from "react";
import ReactDOM from "react-dom/client";

import Header from "./components/Header";
import Example from "./components/Example";
import States from "./components/States";

const VIEWS = {
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
  return view === VIEWS.example ? VIEWS.states : VIEWS.example;
}

function App(props) {
  const [view, setView] = useState(props.view);
  const nextView = getNextView(view);

  return (
    <>
      <button onClick={() => setView(preView => getNextView(preView))}>
        Switch to {nextView.key}
      </button>
      {view.component}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("reactapp"));
root.render(
  <StrictMode>
    <Header />
    <App view={VIEWS.example} />
  </StrictMode>
);