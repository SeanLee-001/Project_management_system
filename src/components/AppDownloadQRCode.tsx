/**
 * APP下载二维码组件
 * 显示隐藏式二维码供用户扫码下载移动端APP
 */
import React, {useState} from 'react';
import QRCode from 'react-qr-code';

interface AppDownloadQRCodeProps {
  downloadUrl?: string;
  appVersion?: string;
}

export default function AppDownloadQRCode({
  downloadUrl = 'https://example.com/download-app',
  appVersion = '1.0.0',
}: AppDownloadQRCodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 隐藏式图标按钮 - 右上角 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-12 right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 opacity-60 hover:opacity-100"
          title="下载移动端APP">
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* 二维码弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
            {/* 关闭按钮 */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 标题 */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                下载移动端APP
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                扫码下载，随时随地管理项目
              </p>
            </div>

            {/* 二维码 */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl shadow-md">
                <QRCode
                  value={downloadUrl}
                  size={200}
                  level="M"
                />
              </div>
            </div>

            {/* 下载信息 */}
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                <span>APP版本</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {appVersion}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                <span>支持平台</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  iOS / Android
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>下载链接</span>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                  点击下载
                </a>
              </div>
            </div>

            {/* 底部提示 */}
            <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
              <p>使用微信或浏览器扫码即可下载</p>
              <p className="mt-1">如有问题请联系系统管理员</p>
            </div>
          </div>
        </div>
      )}

      {/* 添加样式动画 */}
      <style jsx global>{`
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
