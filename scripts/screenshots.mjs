// 매뉴얼·README 화면 캡처: 데모 모드로 메뉴마다 PC(1280)·모바일(390) 화면을 찍어 docs/screenshots/에 저장한다.
// 사용: npm run screenshots [-- --url https://주소:5173] [--only dashboard,visits]
//   주소 기본값: ZF_SHOT_URL → http://127.0.0.1:5173. 개발 서버(npm start)나 빌드 미리보기(npm run preview:dist)가 떠 있어야 한다.
//   새 버전 알림 띠는 숨기고, 브리핑 작성이 끝난 뒤 찍는다. 데모라 실제 데이터·개인정보가 들어가지 않는다.
import {chromium} from 'playwright';
import fs from 'node:fs';

const arg=(k)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:''};
const base=(arg('url')||process.env.ZF_SHOT_URL||'http://127.0.0.1:5173').replace(/\/$/,'');
const only=new Set((arg('only')||'').split(',').filter(Boolean));
const out='docs/screenshots';fs.mkdirSync(out,{recursive:true});

// [파일 이름, 사이드바·하단 메뉴 이름, 추가 동작]
const shots=[
 ['dashboard','운영 현황'],
 ['visits','방문 일정'],
 ['plan-form','방문 일정',async p=>{await p.locator('.mobile-register,.page-actions .btn.primary').filter({visible:true}).first().click();await p.locator('dialog.drawer').waitFor()}],
 ['visit-action','방문·조치'],
 ['activity','활동 요약'],
 ['sites','담당·주기 관리'],
 ['contacts','현장 주소록'],
].filter(([k])=>!only.size||only.has(k));
const sizes=[['pc',1280,860],['mobile',390,844]];

const browser=await chromium.launch();let fail=0;
try{
 for(const [tag,width,height] of sizes){
  const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width,height},deviceScaleFactor:1});
  for(const [key,menu,extra] of shots){
   try{
    await page.goto(base+'/?mode=demo',{waitUntil:'networkidle'});
    await page.addStyleTag({content:'.update-notice{display:none!important}'});
    await page.locator('.ai-brief-out').first().waitFor({timeout:40000});
    // 모바일 하단 메뉴에 없는 메뉴는 사이드바 버튼을 스크립트로 누른다(화면에 보이지 않아도 같은 동작)
    await page.evaluate(m=>{const b=[...document.querySelectorAll('nav button')].find(e=>e.textContent.includes(m));if(!b)throw new Error('메뉴 없음: '+m);b.click()},menu);
    await page.waitForTimeout(key==='activity'?3000:1500);
    if(extra)await extra(page);
    await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);
    const file=`${out}/${key}-${tag}.jpg`;await page.screenshot({path:file,type:'jpeg',quality:70});
    console.log('✓',file);
   }catch(e){fail++;console.error('✗',key,tag,e.message.split('\n')[0])}
  }
  await page.close();
 }
}finally{await browser.close()}
if(fail){console.error(`실패 ${fail}건 — 서버 주소(${base})와 데모 진입을 확인하세요.`);process.exit(1)}
