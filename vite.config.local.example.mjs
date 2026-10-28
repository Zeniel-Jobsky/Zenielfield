// 이 파일을 vite.config.local.mjs 로 복사해 이 PC 전용 개발 서버 설정을 넣는다(git 제외).
// 예: Tailscale 주소 + 자체 서명 https(휴대폰에서 GPS·마이크 사용). 인증서는 .certs/ (git 제외).
import fs from "node:fs";
process.env.DEV_HOST ??= "100.x.y.z"; // next.config.ts(allowedDevOrigins)도 이 값을 읽는다
const host = process.env.DEV_HOST;
export default {
  server: {
    host,
    allowedHosts: [".ts.net"],
    cors: { origin: [`https://${host}:5173`] },
    ...(fs.existsSync(".certs/dev.key") ? { https: { key: fs.readFileSync(".certs/dev.key"), cert: fs.readFileSync(".certs/dev.crt") } } : {}),
  },
};
