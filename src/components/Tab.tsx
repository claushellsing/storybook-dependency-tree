import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { styled } from 'storybook/internal/theming';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { useGlobals, useParameter } from '@storybook/manager-api';

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

function isIndex(label: string) {
  return label === 'index.ts' || label === 'index.js';
}

function transformTree(input: any, basePath: string = ''): TreeViewBaseItem[] {
  const result: Array<TreeViewBaseItem> = [];

  for (const [key, value] of Object.entries(input)) {
    const id = `item-${globalCounter++}`; // Use the global counter to ensure uniqueness
    const componentPath = key.replace(basePath, '').replace(/^\//, '');
    const label = componentPath.split('/').pop() || componentPath;

    if (isIndex(label)) {
      const children = transformTree(value, basePath);
      result.push(...children);
    } else {
      const children = transformTree(value, basePath);

      result.push({
        id,
        label,
        ...(children.length ? { children } : {}),
      });
    }
  }

  return result;
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
  const [globals] = useGlobals();

  const paramBasePath: string = globals['storybook_dependency_map_base_path'];
  const currentStoryPath = useParameter('story_absolute_path');
  const [parsedTreeDep, setParsedTreeDep] = useState<Array<TreeViewBaseItem>>([]);
  const [expandedIds, setExpandedIds] = useState<Array<string>>([]);

  useEffect(() => {
    const paramTreeDep = globals['storybook_dependency_map'][currentStoryPath];

    if (paramTreeDep) {
      const transformedTree = transformTree(paramTreeDep, paramBasePath);
      setParsedTreeDep(transformedTree);
      setExpandedIds(collectIds(transformedTree));
    }
  }, [currentStoryPath, paramBasePath]);

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
