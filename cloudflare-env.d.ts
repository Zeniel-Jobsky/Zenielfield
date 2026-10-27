declare namespace Cloudflare {
  interface Env {
    ZENIFIELD_AUTH_PROVIDER?: string;
    ZENIFIELD_SUPABASE_URL?: string;
    ZENIFIELD_GATEWAY_TOKEN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
