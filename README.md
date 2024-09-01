# Storybook Addon: Dependency Tree

## Overview
**Storybook Dependency Tree** is a Storybook addon that visualizes the dependency hierarchy of each story in a tree view. This tool helps developers better understand and navigate the dependencies and dependents associated with their stories, making the development process more efficient.

> **Note:** This project is a work in progress and is actively being developed.

![Dependency Tree Preview](https://github.com/user-attachments/assets/b8fdb45b-b6dd-4e42-bcf7-983824b098bf)

## Features
- **Visual Dependency Mapping**: Automatically loads and displays all dependencies for the currently open story, providing a clear and structured view similar to [storybook-addon-deps](https://storybook.js.org/addons/storybook-addon-deps).
- **Dependents Visualization**: In addition to dependencies, the addon also displays all dependents, helping you see which components rely on the current story.
- **Seamless Integration**: Integrates smoothly with Storybook, enhancing your development workflow.
- **Runtime Execution**: Runs at runtime without requiring any additional commands.
- **Zero Configuration**: No configuration is needed to get started.

## Dependencies
- **Dependency Loading**: Powered by [node-dependency-tree](https://github.com/dependents/node-dependency-tree) to accurately map and load dependencies.
- **Tree View**: Utilizes [MUI X](https://github.com/mui/mui-x) for a robust and interactive tree view experience.

## Installation
To install the addon, run the following command in your project directory:

```bash
npm i storybook-dependency-tree
