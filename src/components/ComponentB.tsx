import React from 'react';
import { ComponentA } from './ComponentA';

interface ButtonProps {
  /**
   * Button contents
   */
  label: string;
}

/**
 * Primary UI component for user interaction
 */
export const ComponentB = ({
  label,
  ...props
}: ButtonProps) => {
  return (
    <div>
    <ComponentA content={'This is ppp'} />
    <span
      {...props}
    >
      {label}
    </span>
    </div>
  );
};
