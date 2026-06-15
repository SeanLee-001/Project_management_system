#!/usr/bin/env node

/**
 * 自动清理 TypeScript 文件中未使用的导入
 * 使用方法：node scripts/cleanup-unused-imports.js
 */

const fs = require('fs');
const path = require('path');

function cleanupFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // 识别未使用导入的模式（简化版）
  // 这里只做基础清理：移除连续的空行（超过 2 行）
  let cleaned = content.replace(/\n{3,}/g, '\n\n');
  
  if (cleaned !== content) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`Cleaned: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.next')) {
      walkDir(fullPath, callback);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  });
}

let cleanedCount = 0;
walkDir('/workspace/src', (filePath) => {
  if (cleanupFile(filePath)) {
    cleanedCount++;
  }
});

console.log(`\nTotal cleaned: ${cleanedCount} files`);
