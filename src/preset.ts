import type { Plugin } from 'vite';
import dependencyTree from 'dependency-tree';
import { parse } from '@typescript-eslint/parser';
import { traverse } from 'estraverse';
import type { Statement, VariableDeclarator } from '@typescript-eslint/types/dist/generated/ast-spec';

type NestedTree = Record<string, unknown>;

export interface ViteConfig {
  plugins: Array<unknown>;
  root: string;
}
const basePath = process.cwd();

const isUserStory = (path: string): boolean =>
  ['.stories.ts', '.stories.js', '.stories.jsx', '.stories.tsx'].some((ext) => path.endsWith(ext));

const getStoryDependenciesFromFile = (storyPath: string): object => {
  const tree = dependencyTree({
    filename: storyPath,
    directory: basePath,
    tsConfig: `${basePath}/tsconfig.json`, //Todo: pass as parameter
    filter: (path: string) =>
      path.indexOf('node_modules') === -1 && !path.endsWith('.css'),
  }) as Record<string, unknown>;

  return tree;
}

const cleanBasePath = (tree: object): object => {
  const result: Record<string, object> = {};
  for (const [key, value] of Object.entries(tree)) {
    const cleanKey = key.replace(basePath, '').replace(/^\//, '');
    if (value && typeof value === 'object') {
      result[cleanKey] = cleanBasePath(value);
    } else {
      result[cleanKey] = value;
    }
  }
  return result;
}

export const buildDependantsFromDependencyTree = (
  forest: object
): object => {
  // Phase 1: build DIRECT dependants graph from the nested dependency forest
  const directDependants: Record<string, Set<string>> = {};

  const ensure = (k: string) => {
    if (!directDependants[k]) directDependants[k] = new Set<string>();
  };

  const walk = (parent: string, node: NestedTree) => {
    for (const [child, nested] of Object.entries(node)) {
      ensure(child);
      directDependants[child].add(parent);
      if (nested && typeof nested === 'object') {
        walk(child, nested as NestedTree);
      }
    }
  };

  for (const [root, tree] of Object.entries(forest)) {
    ensure(root);
    if (tree && typeof tree === 'object') {
      walk(root, tree as NestedTree);
    }
  }

  // Phase 2: materialize a NESTED dependants tree for every node
  const allNodes = new Set<string>([...Object.keys(directDependants)]);
  for (const parents of Object.values(directDependants)) {
    for (const p of parents) allNodes.add(p);
  }

  const memoTree: Record<string, object> = {};

  const buildTree = (node: string, visiting: Set<string>): object => {
    if (memoTree[node]) return memoTree[node];
    if (visiting.has(node)) return {}; // guard cycles by cutting here
    visiting.add(node);
    const childrenObj: Record<string, object> = {};
    const parents = directDependants[node] || new Set<string>();
    for (const p of parents) {
      childrenObj[p] = buildTree(p, visiting);
    }
    visiting.delete(node);
    memoTree[node] = childrenObj;
    return childrenObj;
  };

  const forestOut: Record<string, object> = {};
  for (const n of allNodes) {
    forestOut[n] = buildTree(n, new Set<string>());
  }
  return forestOut;
};

const addStoryAbsolutePathToParameters = (source: string, id: string): string => {
  const sourceRoot = parse(source);

  const additions = sourceRoot.body.flatMap((statement: Statement) => {
    if (statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration') {
      return statement.declaration.declarations.map((declarator: VariableDeclarator) => {
        if (declarator.id.type === 'Identifier') {
          const storyName = declarator.id.name;
          const filteredId = id.replace(basePath, '').replace(/^\//, '');
          return `\n${storyName}.parameters = { ...${storyName}.parameters, story_absolute_path: "${filteredId}" };`;
        }
        return '';
      });
    }
    return [];
  }).join('');

  return source + additions;
}

const buildDependencyTreeFromStories = (source: string): object => {
  const storiesFilePaths: Array<string> = [];
  const sourceRoot = parse(source);

  traverse(sourceRoot, {
    enter: function(node) {
      if (node.type === 'ImportExpression' && node.source.type === 'Literal') {
        const path = node.source.value as string;
        if (path.startsWith('/')) {
          storiesFilePaths.push(path);
        }
      }
    }
  });

  let dependencyTreeObj = {};
  storiesFilePaths.forEach((storyPath: string) => {
    dependencyTreeObj = {...dependencyTreeObj, ...getStoryDependenciesFromFile(storyPath)};
  });

  return dependencyTreeObj;
}

export function vitePreTreeDependencyPlugin(config: ViteConfig): Plugin {
  return {
    name: 'storybook-dependency-tree',

    transform(source, id) {
      let newSource = source;

      // Add file related to every story
      if (isUserStory(id)) {
        newSource = addStoryAbsolutePathToParameters(source, id);
      }

      // List of stories and dependencies
      if (id.endsWith('virtual:/@storybook/builder-vite/storybook-stories.js')) {
        let dependencyTreeObj = buildDependencyTreeFromStories(source);
        dependencyTreeObj = cleanBasePath(dependencyTreeObj);
        
        const dependantsTreeObj = buildDependantsFromDependencyTree(dependencyTreeObj);
        
        newSource += `\nlocalStorage.setItem("dependencyTreeObj", '${JSON.stringify(dependencyTreeObj)}');`;
        newSource += `\nlocalStorage.setItem("dependantsTreeObj", '${JSON.stringify(dependantsTreeObj)}');`;
      }

      return { code: newSource, map: null };
    },
  };
}

export const viteFinal = async (config: ViteConfig) => {
  return {
    ...config,
    plugins: [
      ...config.plugins,
      vitePreTreeDependencyPlugin(config),
    ],
  };
};

export const webpack = async (config: any) => {
  return config;
};
