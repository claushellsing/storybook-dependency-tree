import { LightningIcon } from "@storybook/icons";
import React, { useCallback } from "react";
import { Code, H1, IconButton, Link } from "storybook/internal/components";
import { useParameter } from "storybook/internal/manager-api";
import { styled } from "storybook/internal/theming";

import { ADDON_ID } from "../constants";

interface TabProps {
  active: boolean;
}

const TabWrapper = styled.div(({ theme }) => ({
  background: theme.background.content,
  padding: "4rem 20px",
  minHeight: "100vh",
  boxSizing: "border-box",
}));

const TabInner = styled.div({
  maxWidth: 768,
  marginLeft: "auto",
  marginRight: "auto",
});

export const Tab: React.FC<TabProps> = () => {
  const parameter = useParameter(ADDON_ID);

  console.log(parameter);
  return (
    <TabWrapper>
      <TabInner>
        <p>
          { JSON.stringify(parameter) }
        </p>
      </TabInner>
    </TabWrapper>
  );
};
