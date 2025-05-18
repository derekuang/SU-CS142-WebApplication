import React from "react";
import "./styles.css";

/**
 * Define States, a React component of CS142 Project 4, Problem 2. The model
 * data for this view (the state names) is available at
 * window.cs142models.statesModel().
 */
class States extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      names: window.cs142models.statesModel().sort(),
      substr: "",
    };
  }

  handleChange = (event) => {
    this.setState({ substr: event.target.value });
  };

  inputField() {
    return (
      <div className="cs142-states-input-container">
        <label className="cs142-states-input-label" htmlFor="inId">Input Field:</label>
        <input
          className="cs142-states-input-field"
          id="inId"
          type="text"
          value={this.state.substr}
          onChange={this.handleChange}
        />
      </div>
    );
  }

  stateList() {
    const filterList = this.state.names
      .filter((name) => name.toLowerCase().includes(this.state.substr.toLowerCase()));
    const filterResult = (
      <ul className="cs142-states-list">
        {filterList.map((name) => (
          <li className="cs142-states-list-item" key={name}>{name}</li>
        ))}
      </ul>
    );
    const emptyNotice = <p className="cs142-states-empty-notice">No State matched!</p>;

    return (
      filterList.length ? filterResult : emptyNotice
    );
  }

  render() {
    return (
      <div className="states">
        {this.inputField()}
        {this.state.substr && <p className="cs142-states-filter-text">Filter substring: {this.state.substr}</p>}
        {this.stateList()}
      </div>
    );
  }
}

export default States;
