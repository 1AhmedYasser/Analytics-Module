import React, { FC } from 'react';
import './ProgressBar.scss';

type ProgressBarProps = {
  readonly value: number;
  readonly max: number;
  readonly color: string;
};

const ProgressBar: FC<ProgressBarProps> = ({ value, max, color }) => {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="progress-bar">
      <div
        className="progress-bar__fill"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
};

export default ProgressBar;
