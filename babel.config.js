// babel-preset-expo adds react-native-worklets/plugin itself whenever the
// package is installed, so listing it here too would run the worklet transform
// twice. Reanimated 4 needs the plugin, not this entry, to be present.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
