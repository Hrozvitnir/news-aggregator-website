import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Layout from './components/layout/Layout';
import Feed from './pages/Feed';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/feed" element={<Feed/>}></Route>
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
