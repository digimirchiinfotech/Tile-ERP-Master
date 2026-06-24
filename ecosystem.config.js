module.exports = {
  apps: [
    {
      name: 'tile-exporter-backend',
      script: 'src/server.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    },
    {
      name: 'tile-exporter-frontend',
      script: 'server.js',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'tile-exporter-pdf-service',
      script: 'index.js',
      cwd: './pdf-service',
      env: {
        NODE_ENV: 'production',
        PORT: 8001
      }
    }
  ]
};
