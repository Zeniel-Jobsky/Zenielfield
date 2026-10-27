declare namespace Cloudflare {
  interface Env {
    ZENIFIELD_AUTH_PROVIDER?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
