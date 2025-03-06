import type { Plugin } from 'vite';

import dependencyTree from 'dependency-tree';
import { parse } from '@typescript-eslint/parser';
import { traverse } from 'estraverse';

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

export function vitePreTreeDependencyPlugin(config: ViteConfig): Plugin {
  return {
    name: 'storybook-dependency-tree',
    enforce: 'pre',

    transform(source, id) {
      let newSource = source;

      //Add file related to every story
      if (isUserStory(id)) {
        const sourceRoot = parse(source);

        const storiesExported = sourceRoot.body.filter((statement) => {
          return statement.type === 'ExportNamedDeclaration';
        }).map((ExportNamedDeclaration) => {
            return ExportNamedDeclaration.declaration.declarations[0].id.name;
        });

        storiesExported.forEach((storyName) => {
          newSource = `${newSource}\n${storyName}.parameters['story_absolute_path'] = "${id}";\n`;
        });
      }

      //List of stories and dependencies
      if (id.endsWith('virtual:/@storybook/builder-vite/storybook-stories.js')) {
        const storiesFilePaths: Array<string> = [];
        const sourceRoot = parse(source);

        // Traverse the AST
        traverse(sourceRoot, {
          enter: function(node) {
            // Look for ImportExpression nodes (dynamic import())
            if (node.type === 'ImportExpression' && node.source.type === 'Literal') {
              const path = node.source.value;
              // Check if it's an absolute path (starts with /)
              if (path.startsWith('/')) {
                storiesFilePaths.push(path);
              }
            }
          }
        });

        storiesFilePaths.forEach((storyPath: string) => {
          storiesDependencies[storyPath] = getStoryDependencies(storyPath);
        });

        newSource = `${newSource}\nexport const STORYBOOK_DEPENDENCY_MAP = ${JSON.stringify(storiesDependencies)};\n`;
        newSource = `${newSource}\nexport const STORYBOOK_DEPENDENCY_MAP_BASE_PATH = "${basePath}";\n`;
        newSource = `${newSource}\nexport const STORIES_LIST = ${JSON.stringify(storiesFilePaths)};\n`;
      }

      // Trasnform vite padd
      if (id.endsWith('virtual:/@storybook/builder-vite/vite-app.js')) {

        const regex = /import\s*{\s*importFn\s*}\s*from\s*['"]([^'"]+)['"];?/;
        const replacement = `import { importFn, STORYBOOK_DEPENDENCY_MAP, STORYBOOK_DEPENDENCY_MAP_BASE_PATH, STORIES_LIST } from '$1';
        const dependencyComposeConfigs = (configs) => {
          const previewConfigs = composeConfigs(configs); 
          previewConfigs.initialGlobals.storybook_dependency_map = STORYBOOK_DEPENDENCY_MAP;
          previewConfigs.initialGlobals.storybook_dependency_map_base_path = STORYBOOK_DEPENDENCY_MAP_BASE_PATH;
          previewConfigs.initialGlobals.stories_list = STORIES_LIST;          
          return previewConfigs;
        }
        `;  

        newSource = newSource.replace(regex, replacement);
        newSource = newSource.replaceAll(
          'return composeConfigs',
          'return dependencyComposeConfigs'
        );
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
