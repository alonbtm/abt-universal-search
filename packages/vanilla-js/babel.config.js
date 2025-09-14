export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        browsers: [
          'Chrome >= 80',
          'Firefox >= 75',
          'Safari >= 13',
          'Edge >= 80'
        ]
      },
      modules: false,
      useBuiltIns: 'usage',
      corejs: false // No polyfills, keep bundle minimal
    }]
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ]
    }
  }
};