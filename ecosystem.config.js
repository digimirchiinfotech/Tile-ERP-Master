module.exports = {
  apps: [
    {
      name: 'tile-exporter-backend',
      script: './backend/src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      }
    },
    {
      name: 'tile-exporter-frontend',
      script: './frontend/server.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'tile-exporter-pdf-service',
      script: './pdf-service/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8001
      }
    }
  ]
};
