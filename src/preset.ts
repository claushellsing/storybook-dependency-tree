import type { Plugin } from 'vite';
import type { Node } from 'estree';

import dependencyTree from 'dependency-tree';
import { Parser } from 'acorn';
import estraverse from 'estraverse';

const storiesDependencies: Record<string, object> = {};

export interface ViteConfig {
  plugins: Array<unknown>;
  root: string;
}
const basePath = process.cwd();

// Function to determine if the file is a story file
const isUserStory = (path: string): boolean =>
  ['.stories.ts', '.stories.js', '.stories.jsx', '.stories.tsx'].some((ext) => path.endsWith(ext));

function getStoryDependencies(storyPath: string) {
  const tree = dependencyTree({
    filename: storyPath,
    directory: basePath,
    tsConfig: `${basePath}/tsconfig.json`, //Todo: pass as parameter
    filter: (path: string) =>
      path.indexOf('node_modules') === -1 && path !== storyPath && !path.endsWith('.css'),
  }) as Record<string, any>;

  return tree[storyPath] as object;
}

export function viteDependencyPlugin(config: ViteConfig): Plugin {
  return {
    name: 'storybook-dependency-tree',
    enforce: 'post',

    transform(source, id) {
      let newSource = source;

      //List of stories and dependencies
      if (id === '/virtual:/@storybook/builder-vite/storybook-stories.js') {
        const storiesFilePaths: Array<string> = [];

        const root = Parser.parse(source, {
          sourceType: 'module',
          ecmaVersion: 'latest',
        });

        estraverse.traverse(root as Node, {
          enter: function (node) {
            // Check if the node is a Literal and its value matches the pattern
            if (node.type === 'Literal' && typeof node.value === 'string') {
              const value = node.value;
              if (value.startsWith('/@fs/') && isUserStory(value)) {
                storiesFilePaths.push(value.replace('/@fs/', ''));
              }
            }
          },
        });

        storiesFilePaths.forEach((storyPath: string) => {
          storiesDependencies[storyPath] = getStoryDependencies(storyPath);
        });

        newSource = `${newSource}\nexport const STORYBOOK_DEPENDENCY_MAP = ${JSON.stringify(storiesDependencies)};\n`;
        newSource = `${newSource}\nexport const STORYBOOK_DEPENDENCY_MAP_BASE_PATH = "${basePath}";\n`;
      }

      //Add dependency map to globals
      if (id.endsWith('storybook-dependency-tree/dist/preview.js')) {
        newSource = newSource.replace(
          'storybook_dependency_map: {}',
          `storybook_dependency_map: ${JSON.stringify(storiesDependencies)}`
        );
        newSource = newSource.replace(
          'storybook_dependency_map_base_path: ""',
          `storybook_dependency_map_base_path: "${basePath}"`
        );
      }

      //Add file related to every story
      if (isUserStory(id)) {
        const root = Parser.parse(source, {
          sourceType: 'module',
          ecmaVersion: 'latest',
        });

        const storiesExported: string[] = [];

        //Detect the name of all exported stories
        estraverse.traverse(root as Node, {
          enter: function (node, parent) {
            if (node.type === 'Identifier' && node.name === '__namedExportsOrder') {
              const parentNode = parent;
              parentNode.init.elements.forEach((element) => {
                const literalValue = element.value;
                storiesExported.push(`${literalValue}`);
              });
            }
          },
        });

        storiesExported.forEach((storyName) => {
          newSource = `${newSource}\n${storyName}.parameters['story_absolute_path'] = "${id}";\n`;
        });
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
      viteDependencyPlugin(config), // Plugin added here
    ],
  };
};

export const webpack = async (config: any) => {
  return config;
};

export const managerEntries = (entry: Array<unknown> = []) => {
  return [...entry, require.resolve('../dist/manager.js')];
};

export const previewAnnotations = (entry: Array<unknown> = []) => {
  return [...entry, require.resolve('../dist/preview.js')];
};
