module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@stores': './src/stores',
            '@utils': './src/utils',
            '@types': './src/types',
            '@assets': './src/assets',
            '@constants': './src/constants',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
