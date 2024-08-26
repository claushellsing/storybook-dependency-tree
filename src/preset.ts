import { Node } from "acorn";
import { ADDON_ID } from "./constants";
import type { Plugin } from "vite";

const dependencyTree = require('dependency-tree');
const { Parser } = require("acorn");
const estraverse = require("estraverse");


export function viteDependencyPlugin(config: any): Plugin {
  // Function to determine if the file is a story file
  const isUserStory = (path: string): boolean => ['.stories.ts', '.stories.js', '.stories.jsx', '.stories.tsx'].some(ext => path.endsWith(ext));

  return {
    name: 'storybook-dependency-tree',
    enforce: 'post',

    transform(source, id) {
      let newSource = source;
      if (isUserStory(id)) {
        const ast  = Parser.parse(source, { sourceType: 'module' });
        const storiesExported: string[] = [];

        //Detect the name of all exported stories
        estraverse.traverse(ast, {
          enter: function (node: Node, parent: Node) {
              if ((node.type === 'Identifier') && (node.name === '__namedExportsOrder')) {
                parent.init.elements.forEach(element => {
                  storiesExported.push(element.value);
                });
              }
          },
        });

        const tree = dependencyTree({
          filename: id,
          directory: process.cwd(),
          filter: (path: string) => 
            path.indexOf('node_modules') === -1 &&
            path !== id && 
            !path.endsWith('.css'),
        });

        const dependencyTreeStatement = `var _DEPENDENCY_MAP_ = ${JSON.stringify(tree)};`
        newSource = `${dependencyTreeStatement}\n${newSource}`;

        storiesExported.forEach(storyName => {
          newSource = `${newSource}\n${storyName}.parameters['${ADDON_ID}'] = _DEPENDENCY_MAP_;\n`;
        });
        
      }

      return { code: newSource, map: null };
    },
  };
}

export const viteFinal = async (config: any) => {
  console.log("This addon is augmenting the Vite config");
  return {
    ...config,
    plugins: [
      ...config.plugins,
      viteDependencyPlugin(config),  // Plugin added here
    ]
  };
};

export const webpack = async (config: any) => {
  console.log("This addon is augmenting the Webpack config");
  return config;
};
