/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoryProvider } from './context/StoryContext';
import Home from './pages/Home';
import Config from './pages/Config';
import BibleReview from './pages/BibleReview';
import Generator from './pages/Generator';

export default function App() {
  return (
    <StoryProvider>
      <Router>
        <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/config" element={<Config />} />
            <Route path="/bible" element={<BibleReview />} />
            <Route path="/generator" element={<Generator />} />
          </Routes>
        </div>
      </Router>
    </StoryProvider>
  );
}

