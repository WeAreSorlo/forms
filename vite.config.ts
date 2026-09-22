import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    root: 'public',
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"), // Map @ to src/
        },
    },
    build: {
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, "public/index.html"),
                marketo: path.resolve(__dirname, "public/marketo.html"),
            },
        },
    },
});
