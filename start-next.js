#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// 获取命令行参数
const args = process.argv.slice(2);
const port = args.includes('--port')
  ? args[args.indexOf('--port') + 1]
  : process.env.PORT || 3000;

console.log('Starting Next.js server...');
console.log('Port:', port);
console.log('Environment:', process.env.NODE_ENV || 'development');

// 启动Next.js服务器
const nextPath = path.join(__dirname, 'node_modules', '.bin', 'next');
const nextProcess = spawn('node', [nextPath, 'start', '-p', port], {
  stdio: 'inherit',
  shell: true
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`Next.js exited with code ${code}`);
  process.exit(code);
});
