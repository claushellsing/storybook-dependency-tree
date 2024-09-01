import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { styled } from 'storybook/internal/theming';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { useGlobals, useParameter } from '@storybook/manager-api';

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
    if (node.children) {
      node.children.forEach(traverse);
    }
  };

  tree.forEach(traverse);
  return ids;
};

const isIndex = (label: string): boolean => {
  return label === 'index.ts' || label === 'index.js';
};

const transformTree = (input: Record<string, any>, basePath: string = ''): TreeViewBaseItem[] => {
  const result: TreeViewBaseItem[] = [];

  for (const [key, value] of Object.entries(input)) {
    const id = `item-${globalCounter++}`; // Use the global counter to ensure uniqueness
    const componentPath = key.replace(basePath, '').replace(/^\//, '');
    const label = componentPath;

    if (isIndex(label)) {
      const children = transformTree(value, basePath);
      result.push(...children);
    } else {
      const children = transformTree(value, basePath);

      result.push({
        id,
        label,
        fullPath: key,
        ...(children.length ? { children } : {}),
      });
    }
  }

  return result;
};

const findAllImmediateParentPaths = (
  tree: Record<string, any>,
  targetFullPath: string,
  ignorePaths: string[] = [],
  basePath: string
): TreeViewBaseItem[] => {
  const result: TreeViewBaseItem[] = [];
  const foundPaths = new Set<string>();

  const traverse = (currentNode: Record<string, any>) => {
    for (const fullPath in currentNode) {
      if (Object.prototype.hasOwnProperty.call(currentNode, fullPath)) {
        const children = currentNode[fullPath];
        if (
          Object.prototype.hasOwnProperty.call(children, targetFullPath) &&
          !ignorePaths.includes(fullPath) &&
          !foundPaths.has(fullPath)
        ) {
          foundPaths.add(fullPath);
          result.push({
            id: `dep-${globalCounter++}`,
            label: fullPath.replace(basePath, '').replace(/^\//, ''),
            fullPath,
            children: [],
          });
        }
        traverse(children);
      }
    }
  };

  traverse(tree);

  for (const key in result) {
    const node = result[key];
    node.children = findAllImmediateParentPaths(tree, node.fullPath, ignorePaths, basePath);
  }

  return result;
};

const TabWrapper = styled('div')(({ theme }) => ({
  background: theme.background.content,
  padding: '4rem 20px',
  minHeight: '100vh',
  boxSizing: 'border-box',
}));

const TabInner = styled('div')({
  maxWidth: 768,
  marginLeft: 'auto',
  marginRight: 'auto',
});

export const Tab: React.FC = () => {
  const [globals] = useGlobals();

  const paramBasePath: string = globals['storybook_dependency_map_base_path'];
  const currentStoryPath = useParameter<string>('story_absolute_path');
  const [parsedTreeDep, setParsedTreeDep] = useState<TreeViewBaseItem[]>([]);
  const [dependants, setDependants] = useState<TreeViewBaseItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    const globalDependencyMap = globals['storybook_dependency_map'];
    const storiesList = globals['stories_list'];
    const currentDependencyMap = globalDependencyMap[currentStoryPath];

    if (currentDependencyMap) {
      const transformedTree = transformTree(currentDependencyMap, paramBasePath);

      const dependants = transformedTree
        .map((node) => node.fullPath)
        .reduce<TreeViewBaseItem[]>((acc, componentPath) => {
          const componentDependants = findAllImmediateParentPaths(
            globalDependencyMap,
            componentPath,
            storiesList,
            paramBasePath
          );
          return [...acc, ...componentDependants];
        }, []);

      setDependants(dependants);
      setParsedTreeDep(transformedTree);
      setExpandedIds(collectIds(transformedTree));
    }
  }, [currentStoryPath, paramBasePath, globals]);

  return (
    <TabWrapper>
      <TabInner>
        <Typography variant="h5" component="div" gutterBottom>
          Dependencies
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ ml: 2 }}>
          <RichTreeView items={parsedTreeDep} expandedItems={expandedIds} />
        </Box>
        <br />
        <Typography variant="h5" component="div" gutterBottom>
          Dependendants
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ mb: 4, border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
          <RichTreeView items={dependants} />
        </Box>
      </TabInner>
    </TabWrapper>
  );
};
