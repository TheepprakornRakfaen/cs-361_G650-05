import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // แยกไลบรารีใหญ่ออกเป็นไฟล์ของตัวเอง → เบราว์เซอร์ cache ได้นาน ไม่ต้องโหลดใหม่ทุกครั้งที่แก้โค้ดเว็บ
        manualChunks: {
          react: ["react", "react-dom"],
          amplify: ["aws-amplify"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
