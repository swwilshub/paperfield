import {defineConfig,devices} from '@playwright/test';
const BASE=process.env.BASE_URL;
export default defineConfig({
  testDir:'tests',testMatch:/.*\.spec\.js/,timeout:90e3,
  use:{baseURL:BASE||'http://127.0.0.1:8080/',...devices['Pixel 5'],
    launchOptions:process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}},
  webServer:BASE?undefined:{command:'python3 -m http.server 8080 --bind 127.0.0.1',url:'http://127.0.0.1:8080/',reuseExistingServer:true},
});
