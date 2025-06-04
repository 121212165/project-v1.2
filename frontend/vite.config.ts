import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  const config: UserConfig = {
    plugins: [
      react({
        // 启用 React Fast Refresh
        fastRefresh: true,
        // 启用 JSX 运行时优化
        jsxRuntime: 'automatic',
      })
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/store': path.resolve(__dirname, './src/store'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/assets': path.resolve(__dirname, './src/assets')
      }
    },
    
    server: {
      port: 5173,
      host: true,
      open: true,
      cors: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      },
      hmr: {
        overlay: true
      }
    },
    
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'es2022',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // 核心库
            vendor: ['react', 'react-dom'],
            // UI 组件库
            antd: ['antd', '@ant-design/icons'],
            // 路由
            router: ['react-router-dom'],
            // 状态管理
            store: ['zustand', 'immer'],
            // 工具库
            utils: ['axios', 'dayjs', 'classnames'],
            // 图表库
            charts: ['recharts']
          },
          // 优化文件名
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()
              : 'chunk';
            return `js/[name]-[hash].js`;
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            let extType = info[info.length - 1];
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || '')) {
              extType = 'media';
            } else if (/\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/i.test(assetInfo.name || '')) {
              extType = 'img';
            } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
              extType = 'fonts';
            }
            return `${extType}/[name]-[hash].[ext]`;
          }
        }
      },
      // 压缩选项
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      }
    },
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'antd',
        '@ant-design/icons',
        'axios',
        'dayjs',
        'zustand',
        'immer',
        'classnames',
        'recharts'
      ],
      exclude: ['@vitejs/plugin-react']
    },
    
    // CSS 配置
    css: {
      modules: {
        localsConvention: 'camelCase'
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/assets/styles/variables.scss";`
        }
      }
    },
    
    // 环境变量配置
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    
    // 预览配置
    preview: {
      port: 4173,
      host: true,
      open: true
    }
  };
  
  return config;
});