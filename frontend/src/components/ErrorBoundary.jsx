import { Component } from "react";
import { ServerErrorPage } from "../pages/Status";

/**
 * ErrorBoundary — catches unhandled render errors anywhere under its subtree
 * and renders the ServerErrorPage with a Try-Again button (resets the boundary).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] caught", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ServerErrorPage error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}