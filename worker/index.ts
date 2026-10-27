import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { prepareCloudflareDemoRequest } from "../lib/cloudflare-auth";
import { handleCloudflareSupabase } from "../lib/cloudflare-supabase";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    if (env.ZENIFIELD_AUTH_PROVIDER === "supabase-email") {
      const result = await handleCloudflareSupabase(request, env);
      if (result) return result;
      const headers = new Headers(request.headers);
      for (const name of [...headers.keys()]) if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
      request = new Request(request, { headers });
    }
    if (env.ZENIFIELD_AUTH_PROVIDER === "cloudflare-demo") {
      const authenticated = prepareCloudflareDemoRequest(request);
      if (authenticated instanceof Response) return authenticated;
      request = authenticated;
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
