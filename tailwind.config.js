/** @type {import('tailwindcss').Config} */
/** 日式主题：Indigo & Ecru 岁月质感 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 1. 基础背景与文字
  ecru: '#EEF1F7',         // 画布底色
  ink: '#1B263B',          // 核心标题与重要正文
  'stone-wash': '#7A7A7A', // 次要说明文字
  
  // 2. 角色默认定义 (双环热力图、日记主体)
  'user-mom': '#1B263B',   // 靛蓝 (原本的 indigo)
  'user-kid': '#5B7C99',   // 洗水蓝 (原本的 washed-blue)
  
  // 3. 状态与功能 
  'action-primary': '#1B263B', // 主按钮颜色 (深蓝)
  'status-done': '#4A5D66',    // 任务完成、已打卡 (影纳户)
  'status-pending': '#2D3A3A', // 待办、空置状态 (森林绿)
  'tag-life': '#7892B5',       // 温馨生活/情感标签 (萨克斯蓝)
  'tag-task': '#B08B57',       // 家事、严肃任务 (深黄色)
  'tag-light': '#8C2727',      // 轻盈任务/宝宝琐事 (复古的朱红色，作为提醒)
  
  // 4. 特殊强调
  'num-primary': '#1B263B',    // 全局数字颜色
  madder: '#8C2727',           // 茜色 (印章、紧急提醒、高亮)
  'ring-bg': '#7892B5',        // 热力图底色
      },
      fontFamily: {
        display: ['"PingFang SC"', 'Georgia', 'serif'],
        body: ['"PingFang SC"', 'Georgia', 'serif'],
        pingfang: ['"PingFang SC"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      boxShadow: {
        'card': 'none',   // 去工业化：改用边框
        'float': 'none',
        'inner-soft': 'none',
      },
      keyframes: {
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
