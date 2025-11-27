        // Simple deterministic hash for JSON-friendly objects (not cryptographically secure).
        export function hashJson(obj: any): string {
          const s = JSON.stringify(obj);
          let h = 0;
          for (let i = 0; i < s.length; i++) {
            h = (h * 31 + s.charCodeAt(i)) | 0;
          }
          return "h" + (h >>> 0).toString(16);
        }
        