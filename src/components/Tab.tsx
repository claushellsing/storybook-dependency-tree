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
  return label.endsWith('index.ts') || label.endsWith('index.js');
};

const filterTree = (nodes: TreeViewBaseItem[]): TreeViewBaseItem[] => {
  return nodes.reduce((filtered, node) => {
    // If the current node's label is not 'index.ts' or 'index.js', add it to the filtered list
    if (!isIndex(node.label)) {
      const newNode = { ...node };
      
      // Recursively filter children
      if (newNode.children && newNode.children.length > 0) {
        newNode.children = filterTree(newNode.children);
      }
      
      filtered.push(newNode);
    } else {
      // If the node is an index file, push its children to the filtered list instead
      if (node.children && node.children.length > 0) {
        filtered.push(...filterTree(node.children));
      }
    }

    return filtered;
  }, []);
};

const transformTree = (input: Record<string, any>, basePath: string = ''): TreeViewBaseItem[] => {
  const result: TreeViewBaseItem[] = [];

  for (const [key, value] of Object.entries(input)) {
    const id = `item-${globalCounter++}`; // Use the global counter to ensure uniqueness
    const componentPath = key.replace(basePath, '').replace(/^\//, '');
    const label = componentPath;

    const children = transformTree(value, basePath);

    result.push({
      id,
      label,
      fullPath: key,
      ...(children.length ? { children } : {}),
    });
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
  const [dependencies, setDependencies] = useState<TreeViewBaseItem[]>([]);
  const [dependants, setDependants] = useState<TreeViewBaseItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    const globalDependencyMap = globals['storybook_dependency_map'];
    const storiesList = globals['stories_list'];
    const currentDependencyMap = globalDependencyMap[currentStoryPath];

    if (currentDependencyMap) {
      const dependenciesTree = transformTree(currentDependencyMap, paramBasePath);

      const dependants = dependenciesTree
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

      setDependants(filterTree(dependants));
      setDependencies(filterTree(dependenciesTree));
      setExpandedIds(collectIds(dependenciesTree));
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
          <RichTreeView items={dependencies} expandedItems={expandedIds} />
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
