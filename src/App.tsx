import { useEffect, useMemo, useState } from 'react';

type Status = 'working' | 'issue' | 'offline';
type Page = 'home' | 'detail' | 'report' | 'settings';

type Agent = {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: Status;
  todayTokens: number;
  todayCommands: number;
  capacity: number;
  workContent: string;
  tasks: string[];
  commands: string[];
  image: string;
  sceneGif: string;
  sceneJpg: string;
};

type ConnectionState = {
  gatewayUrl: string;
  ok: boolean;
  testing: boolean;
  message: string;
};

const STORAGE_KEY = 'openclaw-mobile-config-v1';
const TOKEN_MAX = 100000000;

const defaultAgents: Agent[] = [
  {
    id: 'elliot-chief-assistant',
    name: 'Elliot',
    role: '首席助理',
    dept: '管理中心',
    status: 'working',
    todayTokens: 28400000,
    todayCommands: 2480,
    capacity: 0.62,
    workContent: '负责 CEO 协同、任务优先级分发、日程推进与团队提醒。',
    tasks: ['梳理 CEO 待办', '同步跨部门任务', '跟进会议纪要'],
    commands: ['日程整理', '任务催办', '邮件提醒', '会议同步'],
    image: 'https://bu.dusays.com/2026/03/28/69c7ac15959dd.png',
    sceneGif: 'https://bu.dusays.com/2026/03/28/69c7d411735ca.gif',
    sceneJpg: 'https://bu.dusays.com/2026/03/28/69c7d411ad7a5.jpg',
  },
  {
    id: 'finn-market-research',
    name: 'Finn',
    role: '市场调研',
    dept: '策略分析部',
    status: 'working',
    todayTokens: 19600000,
    todayCommands: 1730,
    capacity: 0.44,
    workContent: '负责市场洞察、竞品调研、趋势判断与用户画像分析。',
    tasks: ['采集行业动态', '输出竞品追踪', '整理用户反馈'],
    commands: ['数据采集', '竞品分析', '市场扫描', '趋势简报'],
    image: 'https://bu.dusays.com/2026/03/28/69c7ac1593142.png',
    sceneGif: 'https://bu.dusays.com/2026/03/28/69c7d41188cbb.gif',
    sceneJpg: 'https://bu.dusays.com/2026/03/28/69c7d411a7a82.jpg',
  },
  {
    id: 'percy-content-planning',
    name: 'Percy',
    role: '内容策划',
    dept: '内容策划部',
    status: 'issue',
    todayTokens: 23800000,
    todayCommands: 2050,
    capacity: 0.53,
    workContent: '负责内容策略、脚本生成、选题设计与内容发布节奏。',
    tasks: ['生成选题池', '重写脚本开头', '优化内容节奏'],
    commands: ['脚本生成', '标题优化', '选题规划', '内容改写'],
    image: 'https://bu.dusays.com/2026/03/28/69c7ac158bc4f.png',
    sceneGif: 'https://bu.dusays.com/2026/03/28/69c7d4118c56e.gif',
    sceneJpg: 'https://bu.dusays.com/2026/03/28/69c7d411ad754.jpg',
  },
  {
    id: 'blake-growth',
    name: 'Blake',
    role: '流量增长',
    dept: '增长投放部',
    status: 'working',
    todayTokens: 31700000,
    todayCommands: 2860,
    capacity: 0.71,
    workContent: '负责流量增长、投放优化、漏斗追踪与拉新报表整理。',
    tasks: ['拉新数据监控', '优化投放计划', 'AB 测试素材'],
    commands: ['投放优化', 'AB测试', '漏斗分析', '增长复盘'],
    image: 'https://bu.dusays.com/2026/03/28/69c7ac15936fc.png',
    sceneGif: 'https://bu.dusays.com/2026/03/28/69c7d41188cbb.gif',
    sceneJpg: 'https://bu.dusays.com/2026/03/28/69c7d411a7a82.jpg',
  },
  {
    id: 'lukas-sales',
    name: 'Lukas',
    role: '销售成交',
    dept: '销售转化部',
    status: 'offline',
    todayTokens: 15400000,
    todayCommands: 1210,
    capacity: 0.34,
    workContent: '负责客户推进、销售跟单、成交转化与回访记录管理。',
    tasks: ['跟进高意向客户', '生成成交话术', '更新回访记录'],
    commands: ['客户分层', '成交推进', '话术生成', '回访提醒'],
    image: 'https://bu.dusays.com/2026/03/28/69c7ac158a163.png',
    sceneGif: 'https://bu.dusays.com/2026/03/28/69c7d41188cbb.gif',
    sceneJpg: 'https://bu.dusays.com/2026/03/28/69c7d411b20f2.jpg',
  },
];

const weeklyPresets = [
  { year: 2026, week: 12 },
  { year: 2026, week: 13 },
  { year: 2026, week: 14 },
  { year: 2026, week: 15 },
];

const statusText: Record<Status, string> = {
  working: '正在工作',
  issue: '出现问题',
  offline: '未启动',
};

const activityFeed = ['正在同步今日执行面板', '正在整理 Agent 运行日志', '正在刷新 Token 消耗数据', '正在检测异常命令队列'];

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function percentOfMax(value: number) {
  return Math.min(100, Math.round((value / TOKEN_MAX) * 100));
}

function getSavedConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { gatewayUrl: 'http://127.0.0.1:18789/', token: '' };
    }
    return JSON.parse(raw) as { gatewayUrl: string; token: string };
  } catch {
    return { gatewayUrl: 'http://127.0.0.1:18789/', token: '' };
  }
}

function saveConfig(config: { gatewayUrl: string; token: string }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function getSceneMedia(agent: Agent) {
  return agent.status === 'offline' ? agent.sceneJpg : agent.sceneGif;
}

function createWeeklyReports(agents: Agent[]) {
  return weeklyPresets.map((preset, weekIndex) => {
    const rows = agents.map((agent, index) => {
      const dayToken = Math.round(agent.todayTokens * (0.82 + ((weekIndex + index) % 5) * 0.07));
      const weekToken = dayToken * 7;
      return { ...agent, dayToken, weekToken };
    });
    return {
      ...preset,
      label: `${preset.year} 年第 ${preset.week} 周`,
      totalWeekToken: rows.reduce((sum, row) => sum + row.weekToken, 0),
      rows,
    };
  });
}

function shuffleAgents(agents: Agent[]) {
  const list = [...agents];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function StatusDot({ status }: { status: Status }) {
  return <span className={`status-dot ${status}`} />;
}

function AgentAvatar({ agent, large = false }: { agent: Agent; large?: boolean }) {
  return (
    <div className={`agent-avatar ${large ? 'large' : ''}`}>
      <div className="agent-avatar-inner">
        <img src={agent.image} alt={agent.name} />
      </div>
      <div className="agent-avatar-status">
        <StatusDot status={agent.status} />
      </div>
    </div>
  );
}

function AppHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return (
    <div className="app-header">
      <div className="header-left">
        {onBack ? (
          <button className="icon-btn" onClick={onBack}>
            ←
          </button>
        ) : (
          <div className="logo-badge">🐾</div>
        )}
        <div>
          <div className="header-title">{title}</div>
          <div className="header-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="header-mark" />
    </div>
  );
}

function AgentListCard({ agent, active, onClick }: { agent: Agent; active: boolean; onClick: () => void }) {
  return (
    <button className={`agent-list-card ${active ? 'active' : ''}`} onClick={onClick}>
      <AgentAvatar agent={agent} />
      <div className="agent-list-meta">
        <div className="agent-list-row">
          <div>
            <div className="agent-name-small">{agent.name}</div>
            <div className="agent-role-small">{agent.role}</div>
          </div>
          <StatusDot status={agent.status} />
        </div>
        <div className={`status-text ${agent.status}`}>{statusText[agent.status]}</div>
        <div className="mini-bar">
          <div className="mini-bar-fill" style={{ width: `${percentOfMax(agent.todayTokens)}%` }} />
        </div>
      </div>
    </button>
  );
}

function SceneCard({ title, subtitle, agent }: { title: string; subtitle: string; agent: Agent }) {
  return (
    <div className="scene-card">
      <div className="scene-head">
        <div>
          <div className="scene-title">{title}</div>
          <div className="scene-subtitle">{subtitle}</div>
        </div>
        <div className="scene-live">
          <span className="live-dot" />
          LIVE
        </div>
      </div>
      <div className="scene-media-wrap">
        <img src={getSceneMedia(agent)} alt={agent.name} className="scene-media" />
      </div>
      <div className="scene-footer">
        <div className="scene-progress">
          <div className="scene-progress-fill" style={{ width: `${Math.max(18, Math.round(agent.capacity * 100))}%` }} />
        </div>
        <span className="scene-foot-dot green" />
        <span className="scene-foot-dot yellow" />
      </div>
    </div>
  );
}

function HomePage({
  agents,
  selectedId,
  onOpenDetail,
  onNavigate,
  connection,
}: {
  agents: Agent[];
  selectedId: string;
  onOpenDetail: (id: string) => void;
  onNavigate: (page: Page) => void;
  connection: ConnectionState;
}) {
  const selectedAgent = agents.find((agent) => agent.id === selectedId) ?? agents[0];
  const [sceneSeed, setSceneSeed] = useState(0);

  const randomSceneAgents = useMemo(() => shuffleAgents(agents).slice(0, 3), [agents, sceneSeed]);

  useEffect(() => {
    setSceneSeed((value) => value + 1);
  }, [selectedId]);

  return (
    <div className="screen phone-shell">
      <AppHeader title="OpenClaw AGENTS TEAM" subtitle={connection.ok ? '已连接 OpenClaw Gateway' : '移动端团队控制台原型'} />

      <div className="top-status-card">
        <div>
          <div className="card-label">网关连接状态</div>
          <div className="tiny-muted">{connection.gatewayUrl || '未配置 Gateway 地址'}</div>
        </div>
        <div className={`connection-badge ${connection.ok ? 'ok' : 'idle'}`}>{connection.ok ? '已连接' : '未连接'}</div>
      </div>

      <div className="overview-grid">
        <div className="overview-box">
          <div className="tiny-muted">工作中</div>
          <div className="overview-num">{agents.filter((item) => item.status === 'working').length}</div>
        </div>
        <div className="overview-box">
          <div className="tiny-muted">异常</div>
          <div className="overview-num">{agents.filter((item) => item.status === 'issue').length}</div>
        </div>
        <div className="overview-box">
          <div className="tiny-muted">未启动</div>
          <div className="overview-num">{agents.filter((item) => item.status === 'offline').length}</div>
        </div>
      </div>

      <div className="home-grid">
        <div className="left-panel card-panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">TEAM STATUS OVERVIEW</div>
              <div className="tiny-muted">点击进入专属卡片页</div>
            </div>
            <div className="search-chip">⌕</div>
          </div>
          <div className="agent-list">
            {agents.map((agent) => (
              <AgentListCard key={agent.id} agent={agent} active={agent.id === selectedId} onClick={() => onOpenDetail(agent.id)} />
            ))}
          </div>
        </div>

        <div className="right-panel card-panel">
          <div className="panel-head compact">
            <div>
              <div className="panel-title">WORKING TEAM</div>
              <div className="tiny-muted">Agent 工作场景随机展示</div>
            </div>
            <div className={`state-chip ${selectedAgent.status}`}>{statusText[selectedAgent.status]}</div>
          </div>
          <div className="scene-stack">
            <SceneCard title="WORKING TEAM" subtitle={`${randomSceneAgents[0]?.name ?? selectedAgent.name} · ${randomSceneAgents[0]?.role ?? selectedAgent.role}`} agent={randomSceneAgents[0] ?? selectedAgent} />
            <SceneCard title={`${randomSceneAgents[1]?.name ?? selectedAgent.name} • Office`} subtitle={randomSceneAgents[1]?.role ?? selectedAgent.role} agent={randomSceneAgents[1] ?? selectedAgent} />
            <SceneCard title="WORKING" subtitle={`${randomSceneAgents[2]?.name ?? selectedAgent.name} · ${randomSceneAgents[2]?.role ?? selectedAgent.role}`} agent={randomSceneAgents[2] ?? selectedAgent} />
          </div>
          <div className="feed-list">
            {activityFeed.map((item) => (
              <div key={item} className="feed-row">
                ▶ {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav current="home" onNavigate={onNavigate} />
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="detail-section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

function AgentDetail({ agent, onBack, onNavigate }: { agent: Agent; onBack: () => void; onNavigate: (page: Page) => void }) {
  return (
    <div className="screen phone-shell">
      <AppHeader title={agent.name} subtitle="Agent 专属卡片" onBack={onBack} />
      <div className="detail-hero card-panel">
        <div className="detail-hero-banner">
          <img src={getSceneMedia(agent)} alt={agent.name} />
          <div className="detail-hero-overlay" />
        </div>
        <div className="detail-hero-content">
          <AgentAvatar agent={agent} large />
          <div className={`state-chip ${agent.status}`}>{statusText[agent.status]}</div>
        </div>
        <div className="detail-name">{agent.name}</div>
        <div className="detail-role">{agent.role}</div>
        <div className="detail-dept">{agent.dept}</div>
      </div>

      <DetailSection title="工作内容">
        <div className="detail-text">{agent.workContent}</div>
        <div className="tag-wrap">
          {agent.tasks.map((item) => (
            <span key={item} className="tag-item">
              {item}
            </span>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="当前状态">
        <div className="row-between">
          <span className={`status-text ${agent.status}`}>{statusText[agent.status]}</span>
          <span className="tiny-muted">今日执行 {formatNumber(agent.todayCommands)} 条命令</span>
        </div>
        <div className="progress-track large-gap">
          <div className="progress-fill mixed" style={{ width: `${Math.round(agent.capacity * 100)}%` }} />
        </div>
      </DetailSection>

      <DetailSection title="今日 Token 消耗">
        <div className="row-between tiny-muted">
          <span>
            {formatNumber(agent.todayTokens)} / {formatNumber(TOKEN_MAX)}
          </span>
          <span>{percentOfMax(agent.todayTokens)}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill blue" style={{ width: `${percentOfMax(agent.todayTokens)}%` }} />
        </div>
      </DetailSection>

      <DetailSection title="执行命令类型">
        <div className="grid-tags">
          {agent.commands.map((item) => (
            <div key={item} className="grid-tag-item">
              {item}
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="最近执行记录">
        <div className="record-list">
          {[...agent.tasks, ...agent.commands.slice(0, 2)].map((item, index) => (
            <div key={`${item}-${index}`} className="record-item">
              <span>{item}</span>
              <span className="tiny-muted">0{index + 1}:3{index}</span>
            </div>
          ))}
        </div>
      </DetailSection>

      <BottomNav current="home" onNavigate={onNavigate} />
    </div>
  );
}

function WeeklyCard({ report }: { report: ReturnType<typeof createWeeklyReports>[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="weekly-card card-panel">
      <button className="weekly-toggle" onClick={() => setOpen((value) => !value)}>
        <div>
          <div className="panel-title">{report.label}</div>
          <div className="tiny-muted">总消耗 Token</div>
        </div>
        <div className="weekly-right">
          <div className="weekly-total">{formatNumber(report.totalWeekToken)}</div>
          <div className="tiny-muted">{open ? '点击收起' : '点击展开'}</div>
        </div>
      </button>
      {open ? (
        <div className="weekly-table-wrap">
          <table className="weekly-table">
            <thead>
              <tr>
                <th>照片</th>
                <th>名字</th>
                <th>部门</th>
                <th>日薪（token）</th>
                <th>周薪（token）</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={`${report.week}-${row.id}`}>
                  <td>
                    <AgentAvatar agent={row} />
                  </td>
                  <td>{row.name}</td>
                  <td>{row.dept}</td>
                  <td>{formatNumber(row.dayToken)}</td>
                  <td>{formatNumber(row.weekToken)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ReportsPage({ agents, onNavigate }: { agents: Agent[]; onNavigate: (page: Page) => void }) {
  const reports = useMemo(() => createWeeklyReports(agents), [agents]);

  return (
    <div className="screen phone-shell">
      <AppHeader title="团队报表" subtitle="每个周一张表" />
      <div className="section-stack">
        {reports.map((report) => (
          <WeeklyCard key={`${report.year}-${report.week}`} report={report} />
        ))}
      </div>
      <BottomNav current="report" onNavigate={onNavigate} />
    </div>
  );
}

function SettingsPage({
  draft,
  setDraft,
  connection,
  onSave,
  onTest,
  onNavigate,
}: {
  draft: { gatewayUrl: string; token: string };
  setDraft: React.Dispatch<React.SetStateAction<{ gatewayUrl: string; token: string }>>;
  connection: ConnectionState;
  onSave: () => void;
  onTest: () => void;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="screen phone-shell">
      <AppHeader title="连接设置" subtitle="填写 Gateway 地址与 Token" />
      <div className="detail-section">
        <div className="field-label">Gateway 地址</div>
        <input className="text-input" value={draft.gatewayUrl} onChange={(e) => setDraft((prev) => ({ ...prev, gatewayUrl: e.target.value }))} />
        <div className="tiny-muted">本机一般填写 http://127.0.0.1:18789/</div>
      </div>
      <div className="detail-section">
        <div className="field-label">Token</div>
        <input className="text-input" type="password" value={draft.token} onChange={(e) => setDraft((prev) => ({ ...prev, token: e.target.value }))} />
        <div className="tiny-muted">仅保存在浏览器本地 localStorage。</div>
      </div>
      <div className="settings-actions">
        <button className="primary-btn" onClick={onSave}>
          保存配置
        </button>
        <button className="secondary-btn" onClick={onTest} disabled={connection.testing}>
          {connection.testing ? '测试中...' : '连接测试'}
        </button>
      </div>
      <div className={`result-box ${connection.ok ? 'ok' : ''}`}>{connection.message}</div>
      <BottomNav current="settings" onNavigate={onNavigate} />
    </div>
  );
}

function BottomNav({ current, onNavigate }: { current: Page; onNavigate: (page: Page) => void }) {
  return (
    <div className="bottom-nav">
      <button className={`nav-item ${current === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
        首页
      </button>
      <button className={`nav-item ${current === 'report' ? 'active' : ''}`} onClick={() => onNavigate('report')}>
        报表
      </button>
      <button className={`nav-item ${current === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
        设置
      </button>
    </div>
  );
}

export default function App() {
  const saved = getSavedConfig();
  const [page, setPage] = useState<Page>('home');
  const [agents] = useState<Agent[]>(defaultAgents);
  const [selectedId, setSelectedId] = useState(defaultAgents[0].id);
  const [draft, setDraft] = useState(saved);
  const [connection, setConnection] = useState<ConnectionState>({
    gatewayUrl: saved.gatewayUrl,
    ok: false,
    testing: false,
    message: '请先填写配置，然后点击连接测试。',
  });

  const selectedAgent = agents.find((agent) => agent.id === selectedId) ?? agents[0];

  const handleSave = () => {
    const next = { gatewayUrl: draft.gatewayUrl.trim(), token: draft.token.trim() };
    saveConfig(next);
    setDraft(next);
    setConnection((prev) => ({ ...prev, gatewayUrl: next.gatewayUrl, message: '配置已保存到本地浏览器。接下来可以点击连接测试。' }));
  };

  const handleTest = async () => {
    const gatewayUrl = draft.gatewayUrl.trim();
    const token = draft.token.trim();
    if (!gatewayUrl) {
      setConnection({ gatewayUrl: '', ok: false, testing: false, message: '请先填写 Gateway 地址。' });
      return;
    }
    if (!token) {
      setConnection({ gatewayUrl, ok: false, testing: false, message: '请先填写 Token。' });
      return;
    }
    setConnection({ gatewayUrl, ok: false, testing: true, message: '正在请求 /v1/models ...' });
    try {
      const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/v1/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const text = await response.text();
        setConnection({ gatewayUrl, ok: false, testing: false, message: `连接失败：HTTP ${response.status}${text ? `，${text.slice(0, 120)}` : ''}` });
        return;
      }
      setConnection({ gatewayUrl, ok: true, testing: false, message: '连接成功，/v1/models 已返回结果。' });
    } catch (error) {
      setConnection({ gatewayUrl, ok: false, testing: false, message: `连接失败：${error instanceof Error ? error.message : '未知错误'}` });
    }
  };

  if (page === 'detail') {
    return <AgentDetail agent={selectedAgent} onBack={() => setPage('home')} onNavigate={setPage} />;
  }

  if (page === 'report') {
    return <ReportsPage agents={agents} onNavigate={setPage} />;
  }

  if (page === 'settings') {
    return <SettingsPage draft={draft} setDraft={setDraft} connection={connection} onSave={handleSave} onTest={handleTest} onNavigate={setPage} />;
  }

  return <HomePage agents={agents} selectedId={selectedId} onOpenDetail={(id) => { setSelectedId(id); setPage('detail'); }} onNavigate={setPage} connection={connection} />;
}
