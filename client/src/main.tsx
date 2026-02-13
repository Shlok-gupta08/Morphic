import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { FileManagerProvider } from './contexts/FileManagerContext';
import App from './App';
import './index.css';
// Mobile Drag & Drop Polyfill
import { polyfill } from "mobile-drag-drop";
// import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";

polyfill({
  dragImageCenterOnTouch: true,
  // forceApply: true, // Uncomment for debugging on desktop with touch emulation
});

// Fix for drag-image on iOS
window.addEventListener('touchmove', function () { }, { passive: false });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <FileManagerProvider>
          <App />
        </FileManagerProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
