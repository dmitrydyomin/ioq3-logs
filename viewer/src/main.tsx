import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

dayjs.extend(isoWeek);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
