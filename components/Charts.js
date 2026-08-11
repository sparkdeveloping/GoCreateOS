'use client';

export function DonutChart({ rows = [], centerLabel = 'Total' }) {
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  let offset = 0;
  const segments = rows.map((row) => {
    const percent = total ? Number(row.value || 0) / total * 100 : 0;
    const segment = `${row.color || 'var(--chart-blue)'} ${offset}% ${offset + percent}%`;
    offset += percent;
    return segment;
  });
  return <div className="chart-donut-wrap">
    <div className="chart-donut" style={{ background: total ? `conic-gradient(${segments.join(',')})` : 'var(--surface-muted)' }}><span><strong>{total}</strong><small>{centerLabel}</small></span></div>
    <div className="chart-legend">{rows.map((row) => <div key={row.label}><i style={{ background: row.color || 'var(--chart-blue)' }} /><span>{row.label}</span><strong>{row.value}</strong></div>)}</div>
  </div>;
}

export function LineChart({ rows = [], valueKey = 'value', labelKey = 'label' }) {
  const width = 760;
  const height = 240;
  const pad = 28;
  const values = rows.map((row) => Number(row[valueKey] || 0));
  const max = Math.max(1, ...values);
  const points = rows.map((row, index) => {
    const x = rows.length <= 1 ? width / 2 : pad + index * ((width - pad * 2) / (rows.length - 1));
    const y = height - pad - (Number(row[valueKey] || 0) / max) * (height - pad * 2);
    return { x, y, row };
  });
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return <div className="line-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
      {[0, .25, .5, .75, 1].map((tick) => <line key={tick} x1={pad} x2={width - pad} y1={height - pad - tick * (height - pad * 2)} y2={height - pad - tick * (height - pad * 2)} className="chart-grid-line" />)}
      <path d={path} className="chart-line-path" />
      {points.map((point) => <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" className="chart-point"><title>{point.row[labelKey]}: {point.row[valueKey]}</title></circle>)}
    </svg>
    <div className="line-chart-labels">{rows.filter((_, index) => index === 0 || index === rows.length - 1 || index % Math.max(1, Math.floor(rows.length / 5)) === 0).map((row) => <span key={row[labelKey]}>{row[labelKey]}</span>)}</div>
  </div>;
}

export function ComparisonBars({ rows = [], keys = [] }) {
  const max = Math.max(1, ...rows.flatMap((row) => keys.map((key) => Number(row[key.key] || 0))));
  return <div className="comparison-bars">{rows.map((row) => <div className="comparison-row" key={row.label}><span>{row.label}</span><div>{keys.map((key) => <i key={key.key} title={`${key.label}: ${row[key.key] || 0}`} style={{ height: `${Math.max(3, Number(row[key.key] || 0) / max * 100)}%`, background: key.color }} />)}</div></div>)}</div>;
}
