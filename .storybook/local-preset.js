/**
 * to load the built addon in this test Storybook
 */

function managerEntries(entry = []) {
  return [...entry, require.resolve("../dist/manager.js")];
}


export const previewAnnotations = (entry = []) => {
  return [...entry, require.resolve('../dist/preview.js')];
};


module.exports = {
  managerEntries,
  previewAnnotations,
};
