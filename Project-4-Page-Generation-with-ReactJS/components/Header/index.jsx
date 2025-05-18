import React from "react";
import "./style.css";

class Header extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <header>
        <a className="logo" href="#top">Project4: Page Generation with ReactJS</a>
      </header>
    );
  }
}

export default Header;