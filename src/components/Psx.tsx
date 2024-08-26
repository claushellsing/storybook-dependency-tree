import React from 'react';

interface Pprops {
  /**
   * Button contents
   */
  content: string;
}

/**
 * Primary UI component for user interaction
 */
export const Psx = ({
  content,
  ...props
}: Pprops) => {
  return (
    <p
      {...props}
    >
      {content}
    </p>
  );
};
