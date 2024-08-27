import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { useParameter } from 'storybook/internal/manager-api';
import { styled } from 'storybook/internal/theming';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { ADDON_ID_BASE_KEY, ADDON_ID_DEP_TREE } from '../constants';

interface TreeViewBaseItem {
  id: string;
  label: string;
  children?: TreeViewBaseItem[];
}

let globalCounter = 0;

function collectIds(tree: TreeViewBaseItem[]): string[] {
  let ids: string[] = [];

  function traverse(node: TreeViewBaseItem) {
    ids.push(node.id);
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  tree.forEach(traverse);
  return ids;
}

function transformTree(input: any, basePath: string = ''): TreeViewBaseItem[] {
  return Object.keys(input).map((key) => {
    const id = `item-${globalCounter++}`; // Use the global counter to ensure uniqueness

    const componentPath = key.replace(basePath, '').replace(/^\//, '');
    const label = componentPath.split('/').pop() || componentPath;
    const children = transformTree(input[key], basePath);

    return {
      id,
      label,
      ...(children.length ? { children } : {}),
    };
  });
}

const TabWrapper = styled.div(({ theme }) => ({
  background: theme.background.content,
  padding: '4rem 20px',
  minHeight: '100vh',
  boxSizing: 'border-box',
}));

const TabInner = styled.div({
  maxWidth: 768,
  marginLeft: 'auto',
  marginRight: 'auto',
});

export const Tab: React.FC = () => {
  const paramTreeDep = useParameter(ADDON_ID_DEP_TREE);
  const paramBasePath: string = useParameter(ADDON_ID_BASE_KEY);
  const [parsedTreeDep, setParsedTreeDep] = useState<Array<TreeViewBaseItem>>([]);
  const [expandedIds, setExpandedIds] = useState<Array<string>>([]);

  useEffect(() => {
      if(paramTreeDep) {
        const transformedTree = transformTree(paramTreeDep, paramBasePath);
        setParsedTreeDep(transformedTree);
        setExpandedIds(collectIds(transformedTree));
      }
  }, [paramTreeDep, paramBasePath]);

  return (
    <TabWrapper>
      <TabInner>
        <Box sx={{ minHeight: 352, minWidth: 250 }}>
          <RichTreeView items={parsedTreeDep} expandedItems={expandedIds} />
        </Box>
      </TabInner>
    </TabWrapper>
  );
};
