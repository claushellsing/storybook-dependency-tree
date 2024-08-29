import React from 'react';

interface ButtonProps {
  /**
   * Button contents
   */
  label: string;
}

/**
 * Primary UI component for user interaction
 */
export const Component = ({
  label,
  ...props
}: ButtonProps) => {
  return (
    <div>
    <span
      {...props}
    >
      default:{label}
    </span>
    </div>
  );
};
