module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'dist/', 'panmatz-patch/'],
  env: { jest: true, browser: true, node: true },
};
