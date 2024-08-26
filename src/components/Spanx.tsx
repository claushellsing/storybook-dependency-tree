import React from 'react';
import { Psx } from './Psx';

interface ButtonProps {
  /**
   * Button contents
   */
  label: string;
}

/**
 * Primary UI component for user interaction
 */
export const Spanx = ({
  label,
  ...props
}: ButtonProps) => {
  return (
    <div>
    <Psx content={'This is ppp'} />
    <span
      {...props}
    >
      {label}
    </span>
    </div>
  );
};
