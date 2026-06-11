'use client';

import ProductCodeGenerationV2 from './ProductCodeGenerationV2';

export default function ProductCodeManagement() {
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            产品编码生成
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            输入物料信息，自动生成唯一的产品编码（13位）
          </p>
        </div>
      </div>

      <ProductCodeGenerationV2 />
    </div>
  );
}
