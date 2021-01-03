import React from 'react';
import ReactDOM from 'react-dom';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

import './index.css';
import { App } from './App';

dayjs.extend(isoWeek);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
