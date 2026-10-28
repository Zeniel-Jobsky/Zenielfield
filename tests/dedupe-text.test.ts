import assert from 'node:assert/strict';
import {collapseRepeats} from '../app/lib/dedupe-text';
// 음성 인식 반복·말더듬 정리: 연속 반복만 줄이고, 떨어진 반복·나열은 그대로 둔다.
const cases:[string,string][]=[
 ['안내문 교체 안내문 교체 요청 요청 후','안내문 교체 요청 후'],
 ['안내문 교체 안내문 교체 안내문 교체 요청 후 재확인함','안내문 교체 요청 후 재확인함'],
 ['직원 2명 결원. 직원 2명 결원. 수리 요청','직원 2명 결원. 수리 요청'],
 ['매장 방문함 방문함','매장 방문함'],
 ['네 네 확인했습니다','네 확인했습니다'],
 ['1층 2층 3층 점검','1층 2층 3층 점검'],
 ['A매장 B매장 A매장 점검','A매장 B매장 A매장 점검'],
 ['첫 줄 첫 줄\n둘째 줄','첫 줄\n둘째 줄'],
 ['','']];
for(const [input,expected] of cases)assert.equal(collapseRepeats(input),expected,input);
console.log(`${cases.length} dedupe assertions passed: consecutive word/phrase/sentence repeats collapse, non-adjacent repeats and lists kept.`);
