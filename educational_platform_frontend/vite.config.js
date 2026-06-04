import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const prod = mode === "production";
    return {
        server: {
            host: "::",
            port: 8080,
            hmr: {
                overlay: false,
            },
        },
        plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
            dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
        },
        build: {
            sourcemap: !prod,
            minify: "esbuild",
            chunkSizeWarningLimit: 900,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes("node_modules")) {
                            if (id.includes("react-dom") || id.includes("/react/")) return "react";
                            if (id.includes("lucide-react")) return "icons";
                            if (id.includes("@radix-ui")) return "radix";
                            if (id.includes("recharts")) return "charts";
                        }
                    },
                },
            },
            ...(prod && {
                esbuild: {
                    drop: ["console", "debugger"],
                    legalComments: "none",
                },
            }),
        },
    };
});
