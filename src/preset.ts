import { ADDON_ID_BASE_KEY, ADDON_ID_DEP_TREE } from './constants';
import type { Plugin } from 'vite';
import type { ArrayExpression, Literal, VariableDeclarator } from 'acorn';
import type { Node } from 'estree';

import dependencyTree from 'dependency-tree';
import { Parser } from 'acorn';
import estraverse from 'estraverse';

export interface ViteConfig {
  plugins: Array<unknown>,
  root: string,
}

// Function to determine if the file is a story file
const isUserStory = (path: string): boolean =>
  ['.stories.ts', '.stories.js', '.stories.jsx', '.stories.tsx'].some((ext) => path.endsWith(ext));

export function viteDependencyPlugin(config: ViteConfig): Plugin {
  return {
    name: 'storybook-dependency-tree',
    enforce: 'post',

    transform(source, id) {
      let newSource = source;

      if (isUserStory(id)) {
        const root = Parser.parse(source, {
          sourceType: 'module',
          ecmaVersion: 'latest',
        });

        const storiesExported: string[] = [];
        const basePath = process.cwd();

        //Detect the name of all exported stories
        estraverse.traverse(root as Node, {
          enter: function (node, parent) {
            if (node.type === 'Identifier' && node.name === '__namedExportsOrder') {
              const parentNode = parent as VariableDeclarator;

              (parentNode.init as ArrayExpression).elements.forEach((element: Literal) => {
                const literalValue = (element as Literal).value;
                storiesExported.push(`${literalValue}`);
              });
            }
          },
        });

        const tree = dependencyTree({
          filename: id,
          directory: basePath,
          tsConfig:  `${config.root}/tsconfig.json`, //Todo: pass as parameter
          filter: (path: string) =>
            path.indexOf('node_modules') === -1 && path !== id && !path.endsWith('.css'),
        });

        const dependencyTreeStatement = `var _DEPENDENCY_MAP_ = ${JSON.stringify(tree)};`;
        newSource = `${dependencyTreeStatement}\n${newSource}`;

        storiesExported.forEach((storyName) => {
          newSource = `${newSource}\n${storyName}.parameters['${ADDON_ID_DEP_TREE}'] = _DEPENDENCY_MAP_;\n`;
          newSource = `${newSource}\n${storyName}.parameters['${ADDON_ID_BASE_KEY}'] = '${basePath}';\n`;
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
