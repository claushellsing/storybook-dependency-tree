import React, { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { styled } from 'storybook/internal/theming';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { useParameter } from 'storybook/manager-api';

interface TreeNode {
  id: string;
  label: string;
  fullPath: string;
}

interface TreeViewBaseItem extends TreeNode {
  children?: TreeViewBaseItem[];
}

let globalCounter = 0;

const collectIds = (tree: TreeViewBaseItem[]): string[] => {
  const ids: string[] = [];
  const traverse = (node: TreeViewBaseItem) => {
    ids.push(node.id);
    if (node.children) node.children.forEach(traverse);
  };
  tree.forEach(traverse);
  return ids;
};

const isIndex = (label: string): boolean => {
  return label.endsWith('index.ts') || label.endsWith('index.js');
};

const filterTree = (nodes: TreeViewBaseItem[]): TreeViewBaseItem[] => {
  return nodes.reduce<TreeViewBaseItem[]>((filtered, node) => {
    if (!isIndex(node.label)) {
      const newNode: TreeViewBaseItem = { ...node };
      if (newNode.children && newNode.children.length > 0) {
        newNode.children = filterTree(newNode.children);
      }
      filtered.push(newNode);
    } else if (node.children && node.children.length > 0) {
      filtered.push(...filterTree(node.children));
    }
    return filtered;
  }, []);
};

const transformTree = (input: Record<string, any>, basePath: string = ''): TreeViewBaseItem[] => {
  const result: TreeViewBaseItem[] = [];
  for (const [key, value] of Object.entries(input)) {
    const id = `item-${globalCounter++}`;
    const componentPath = key.replace(basePath, '').replace(/^\//, '');
    const label = componentPath;
    const children = transformTree(value as Record<string, any>, basePath);
    result.push({ id, label, fullPath: key, ...(children.length ? { children } : {}) });
  }
  return result;
};

const TabWrapper = styled('div')(({ theme }) => ({
  background: theme.background.content,
  padding: '4rem 10px',
  minHeight: '100vh',
  boxSizing: 'border-box',
  width: '100%',
}));

const TabInner = styled('div')({
  width: '100%',
});

const ColumnsWrapper = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  gap: '20px',
});

const Column = styled('div')({
  flex: 1,
});

export const Tab: React.FC = () => {
  const currentStoryPath = useParameter<string>('story_absolute_path');

  const { dependencies, dependants, dependenciesExpandedIds, dependantsExpandedIds } = useMemo(() => {
    const dependencyTreeObj = JSON.parse(localStorage.getItem('dependencyTreeObj') || '{}');
    const dependantsTreeObj = JSON.parse(localStorage.getItem('dependantsTreeObj') || '{}');

    const depsSource = dependencyTreeObj[currentStoryPath] || {};
    const mainComponentPath = Object.keys(depsSource)[0];
    const dependantsSource = mainComponentPath ? dependantsTreeObj[mainComponentPath] : {};

    const depsTreeFiltered = filterTree(transformTree(depsSource));
    const dependantsTreeFiltered = filterTree(transformTree(dependantsSource));

    return {
      dependencies: depsTreeFiltered,
      dependants: dependantsTreeFiltered,
      dependenciesExpandedIds: collectIds(depsTreeFiltered),
      dependantsExpandedIds: collectIds(dependantsTreeFiltered),
    };
  }, [currentStoryPath]);

    return (
    <TabWrapper>
      <TabInner>
        <ColumnsWrapper>
          <Column>
            <Typography variant="h5" component="div" gutterBottom>
              Dependencies
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ mb: 4, border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
              <RichTreeView items={dependencies} expandedItems={dependenciesExpandedIds} />
            </Box>
          </Column>
          <Column>
            <Typography variant="h5" component="div" gutterBottom>
              Dependants
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ mb: 4, border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
              <RichTreeView items={dependants} expandedItems={dependantsExpandedIds} />
            </Box>
          </Column>
        </ColumnsWrapper>
      </TabInner>
    </TabWrapper>
  );
};
