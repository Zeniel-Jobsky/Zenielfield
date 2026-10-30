'use client';
// 차트 공통 틀: 제목(사실 한 문장) · 범례 · 본문. 차트 자체는 decision.tsx(운영 현황)에 있다.
import type {ReactNode} from 'react';
import {PanelTitle} from '../ui';
export function ChartPanel({title,sub,legend,children}:{title:string;sub?:string;legend?:ReactNode;children:ReactNode}){return <section className="panel chart-panel"><PanelTitle title={title} sub={sub}/>{legend&&<div className="chart-panel-legend">{legend}</div>}<div className="chart-body">{children}</div></section>}
