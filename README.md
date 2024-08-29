# Storybook Addon: Dependency Tree

## Overview
**Storybook Dependency Tree** is an addon for Storybook that visualizes the dependency hierarchy of each story in a tree view. This tool helps developers understand and navigate the dependencies associated with their stories more efficiently.

> **Note:** This project is a work in progress and is under active development.

![CleanShot 2024-08-27 at 01 50 02@2x](https://github.com/user-attachments/assets/7c9e4b1b-eb82-4eb7-a8e7-ca015b6e2636)

## Features
- **Visual Dependency Mapping**: Automatically load and display all dependencies for the currently open story, providing a clear and structured view similar to [storybook-addon-deps](https://storybook.js.org/addons/storybook-addon-deps).
- **Seamless Integration**: Integrates seamlessly with Storybook, enhancing your development workflow.

## Dependencies
- **Dependency Loading**: Powered by [node-dependency-tree](https://github.com/dependents/node-dependency-tree) to accurately map and load dependencies.
- **Tree View**: Utilizes [MUI X](https://github.com/mui/mui-x) for a robust and interactive tree view experience.

## Installation
To install the addon, run the following command in your project directory:

```bash
npm i storybook-dependency-tree
```

After installation, add 'storybook-dependency-tree' to the addons property inside your main Storybook configuration file (e.g., main.js):

```javascript
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    ...
    "storybook-dependency-tree",
  ],
```
