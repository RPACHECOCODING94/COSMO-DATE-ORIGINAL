import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

function App() {
    return (
        <Router>
            <Switch>
                <Route path="/" exact>
                    <h1>Home</h1>
                </Route>
                <Route path="/about">
                    <h1>About</h1>
                </Route>
                {/* Add more routes as needed */}
            </Switch>
        </Router>
    );
}

export default App;