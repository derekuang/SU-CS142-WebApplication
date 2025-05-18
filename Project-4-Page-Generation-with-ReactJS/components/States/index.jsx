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

    this.handleChangeBound = (e) => this.handleChange(e);
  }

  handleChange(event) {
    this.setState({ substr: event.target.value });
  }

  stateList() {
    const filterList = this.state.names
          .filter((name) => name.toLowerCase().includes(this.state.substr.toLowerCase()));
    const filterResult = (
      <ul>
        {filterList.map((name) => (<li key={name}> {name} </li>))}
      </ul>
    );
    const emptyNotice = <p>No State matched!</p>;

    return (
      filterList.length ? filterResult : emptyNotice
    );
  }

  render() {
    return (
      <>
        <div>
          <label htmlFor="inId">Input Field:</label>
          <input
            id="inId"
            type="text"
            value={this.state.substr}
            onChange={this.handleChangeBound}
          />
        </div>
        {this.state.substr && <p>Filter substring: {this.state.substr}</p>}
        {this.stateList()}
      </>
    );
  }
}

export default States;
