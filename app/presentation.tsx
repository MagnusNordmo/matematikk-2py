import katex from "katex";
import type { Visualization } from "./question-bank";

export function MathText({ children }: { children: string }) {
  const parts = children.split(
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$]+?\$|\\\([\s\S]+?\\\))/g,
  );

  return (
    <>
      {parts.map((part, index) => {
        const isDisplay =
          (part.startsWith("$$") && part.endsWith("$$")) ||
          (part.startsWith("\\[") && part.endsWith("\\]"));
        const isInline =
          (part.startsWith("$") && part.endsWith("$") && !isDisplay) ||
          (part.startsWith("\\(") && part.endsWith("\\)"));
        if (!isDisplay && !isInline) return <span key={index}>{part}</span>;

        const expression = part.startsWith("\\")
          ? part.slice(2, -2)
          : isDisplay
            ? part.slice(2, -2)
            : part.slice(1, -1);
        return (
          <span
            key={index}
            className={isDisplay ? "math-display" : "math-inline"}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(expression, {
                throwOnError: false,
                displayMode: isDisplay,
                strict: "ignore",
              }),
            }}
          />
        );
      })}
    </>
  );
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    kategori: "Kategori",
    kategorier: "Kategori",
    frekvens: "Frekvens",
    frekvenser: "Frekvens",
    kumulativ_frekvens: "Kumulativ frekvens",
    klassegrenser: "Klassegrenser",
    figurnummer: "Figurnummer",
    antall: "Antall",
    verdi: "Verdi",
    verdier: "Verdi",
    startverdi: "Startverdi",
    enhet: "Enhet",
    endring_1_prosent: "Endring 1 (%)",
    endring_2_prosent: "Endring 2 (%)",
    mål: "Mål",
    modell: "Modell",
    terskel: "Terskel",
    x_enhet: "Enhet for x",
    y_enhet: "Enhet for y",
    x_navn: "x beskriver",
    y_navn: "y beskriver",
    pris_enhet: "Prisenhet",
    fast_tid: "Fast tid",
    standardavvik_type: "Standardavvik",
    opprinnelige_data: "Opprinnelige data",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString("nb-NO");
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${labelFor(key)}: ${formatValue(item)}`)
      .join(" · ");
  }
  return String(value ?? "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function tableEntries(value: unknown): [string, unknown[]][] | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value).filter((entry): entry is [string, unknown[]] =>
    Array.isArray(entry[1]),
  );
  if (entries.length < 2 || entries[0][1].length === 0) return null;
  return entries.every(([, column]) => column.length === entries[0][1].length)
    ? entries
    : null;
}

function DataTable({
  entries,
  caption = "Tabell",
}: {
  entries: [string, unknown[]][];
  caption?: string;
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>{entries.map(([key]) => <th key={key} scope="col">{labelFor(key)}</th>)}</tr>
        </thead>
        <tbody>
          {entries[0][1].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {entries.map(([key, values]) => (
                <td key={key}><MathText>{formatValue(values[rowIndex])}</MathText></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataPanel({ data }: { data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return null;
  const entries = Object.entries(data).filter(([key]) => key !== "programkode");
  if (entries.length === 0) return null;

  const nestedTable = tableEntries(data.tabell);
  const directTable = tableEntries(Object.fromEntries(entries));
  const displayedTable = nestedTable ?? directTable;
  const tableKeys = new Set(
    nestedTable ? ["tabell"] : (directTable?.map(([key]) => key) ?? []),
  );

  return (
    <div className="data-panel" aria-label="Oppgavedata">
      {displayedTable && <DataTable entries={displayedTable} />}
      <dl className="data-list">
        {entries
          .filter(([key]) => !tableKeys.has(key))
          .map(([key, value]) => (
            <div key={key}>
              <dt>{labelFor(key)}</dt>
              <dd><MathText>{formatValue(value)}</MathText></dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

type Point = { x: number; y: number };

function functionFromExpression(expression: string) {
  const compact = expression.replace(/\s/g, "");
  const exponential = compact.match(/^([+-]?\d+(?:\.\d+)?)\*([+-]?\d+(?:\.\d+)?)\^x$/);
  if (exponential) {
    const a = Number(exponential[1]);
    const b = Number(exponential[2]);
    return (x: number) => a * b ** x;
  }
  const constantFirst = compact.match(/^([+-]?\d+(?:\.\d+)?)\+([+-]?\d+(?:\.\d+)?)\*x$/);
  if (constantFirst) {
    const intercept = Number(constantFirst[1]);
    const slope = Number(constantFirst[2]);
    return (x: number) => intercept + slope * x;
  }
  const slopeFirst = compact.match(/^([+-]?\d+(?:\.\d+)?)\*x\+([+-]?\d+(?:\.\d+)?)$/);
  if (slopeFirst) {
    const slope = Number(slopeFirst[1]);
    const intercept = Number(slopeFirst[2]);
    return (x: number) => intercept + slope * x;
  }
  return null;
}

function linePath(
  points: Point[],
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x)},${scaleY(point.y)}`)
    .join(" ");
}

function tickValues(min: number, max: number, target = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  const roughStep = (max - min) / target;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

function formatAxisValue(value: number) {
  return new Intl.NumberFormat("nb-NO", {
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1,
  }).format(value);
}

function Plot({
  series,
  labels,
  description,
}: {
  series: { name: string; points: Point[]; connect?: boolean }[];
  labels?: string[];
  description: string;
}) {
  const width = 640;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 54 };
  const colors = ["#19766e", "#315f92", "#aa6a2f"];
  const allPoints = series.flatMap((item) => item.points);
  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const scaleX = (x: number) => padding.left + ((x - minX) / Math.max(1, maxX - minX)) * (width - padding.left - padding.right);
  const scaleY = (y: number) => height - padding.bottom - ((y - minY) / Math.max(1, maxY - minY)) * (height - padding.top - padding.bottom);
  const xTicks = tickValues(minX, maxX);
  const yTicks = tickValues(minY, maxY);
  const horizontalAxisY = scaleY(Math.min(maxY, Math.max(minY, 0)));
  const verticalAxisX = scaleX(Math.min(maxX, Math.max(minX, 0)));

  return (
    <figure className="visual-card">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={description}>
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line x1={scaleX(tick)} y1={padding.top} x2={scaleX(tick)} y2={height - padding.bottom} className="chart-grid" />
            <text x={scaleX(tick)} y={height - 16} className="chart-tick" textAnchor="middle">{formatAxisValue(tick)}</text>
          </g>
        ))}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={padding.left} y1={scaleY(tick)} x2={width - padding.right} y2={scaleY(tick)} className="chart-grid" />
            <text x={padding.left - 9} y={scaleY(tick) + 4} className="chart-tick" textAnchor="end">{formatAxisValue(tick)}</text>
          </g>
        ))}
        <line x1={padding.left} y1={horizontalAxisY} x2={width - padding.right} y2={horizontalAxisY} className="chart-axis" />
        <line x1={verticalAxisX} y1={padding.top} x2={verticalAxisX} y2={height - padding.bottom} className="chart-axis" />
        {series.map((item, seriesIndex) => (
          <g key={item.name}>
            {item.connect !== false && item.points.length > 1 && (
              <path d={linePath(item.points, scaleX, scaleY)} fill="none" stroke={colors[seriesIndex % colors.length]} strokeWidth="3" />
            )}
            {item.points.map((point, index) => (
              <circle key={index} cx={scaleX(point.x)} cy={scaleY(point.y)} r="4" fill={colors[seriesIndex % colors.length]} />
            ))}
          </g>
        ))}
      </svg>
      {(labels?.length || series.length > 1) && (
        <figcaption className="chart-legend">
          {labels?.map((label, index) => <span key={label}>{index + 1}: {label}</span>)}
          {series.length > 1 && series.map((item, index) => (
            <span key={item.name}><i style={{ background: colors[index % colors.length] }} />{item.name}</span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

function BarChart({ labels, series, description }: { labels: string[]; series: { name: string; values: number[] }[]; description: string }) {
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  return (
    <figure className="visual-card" role="img" aria-label={description}>
      <div className="bar-chart" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(34px, 1fr))` }}>
        {labels.map((label, labelIndex) => (
          <div className="bar-group" key={label}>
            <div className="bars">
              {series.map((item, seriesIndex) => (
                <span key={item.name} style={{ height: `${Math.max(4, ((item.values[labelIndex] ?? 0) / max) * 150)}px` }} data-series={seriesIndex} title={`${item.name}: ${item.values[labelIndex]}`} />
              ))}
            </div>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <figcaption className="chart-legend">
        {series.map((item, index) => <span key={item.name}><i data-series={index} />{item.name}</span>)}
      </figcaption>
    </figure>
  );
}

function Histogram({
  limits,
  frequencies,
  useDensity,
}: {
  limits: number[];
  frequencies: number[];
  useDensity: boolean;
}) {
  const width = 640;
  const height = 270;
  const padding = { top: 28, right: 24, bottom: 48, left: 64 };
  const classWidths = frequencies.map((_, index) => limits[index + 1] - limits[index]);
  const heights = frequencies.map((frequency, index) =>
    useDensity ? frequency / classWidths[index] : frequency,
  );
  const minX = limits[0];
  const maxX = limits.at(-1) ?? minX + 1;
  const maxY = Math.max(1, ...heights);
  const scaleX = (value: number) => padding.left + ((value - minX) / Math.max(1, maxX - minX)) * (width - padding.left - padding.right);
  const scaleY = (value: number) => height - padding.bottom - (value / maxY) * (height - padding.top - padding.bottom);
  const yTicks = tickValues(0, maxY);
  const yLabel = useDensity ? "Frekvenstetthet" : "Frekvens";

  return (
    <figure className="visual-card">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Histogram med ${yLabel.toLocaleLowerCase("nb-NO")}`}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padding.left} y1={scaleY(tick)} x2={width - padding.right} y2={scaleY(tick)} className="chart-grid" />
            <text x={padding.left - 9} y={scaleY(tick) + 4} className="chart-tick" textAnchor="end">{formatAxisValue(tick)}</text>
          </g>
        ))}
        {frequencies.map((frequency, index) => {
          const left = scaleX(limits[index]);
          const right = scaleX(limits[index + 1]);
          const top = scaleY(heights[index]);
          return (
            <rect
              key={`${limits[index]}-${limits[index + 1]}`}
              x={left}
              y={top}
              width={Math.max(1, right - left)}
              height={height - padding.bottom - top}
              className="histogram-bar"
            >
              <title>{`${limits[index]}–${limits[index + 1]}: ${frequency} observasjoner (${yLabel.toLocaleLowerCase("nb-NO")} ${formatAxisValue(heights[index])})`}</title>
            </rect>
          );
        })}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="chart-axis" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="chart-axis" />
        {limits.map((limit) => (
          <text key={limit} x={scaleX(limit)} y={height - 25} className="chart-tick" textAnchor="middle">{formatAxisValue(limit)}</text>
        ))}
        <text x={14} y={(padding.top + height - padding.bottom) / 2} className="chart-axis-label" textAnchor="middle" transform={`rotate(-90 14 ${(padding.top + height - padding.bottom) / 2})`}>{yLabel}</text>
      </svg>
      <figcaption className="chart-caption">Søylebredden følger klassebredden{useDensity ? ", og søylehøyden viser frekvenstetthet" : ""}.</figcaption>
    </figure>
  );
}

export function VisualizationPanel({ visualization, data }: { visualization?: Visualization; data?: Record<string, unknown> }) {
  if (!visualization) return null;
  const type = visualization.type;
  if (type === "programkode") {
    return <pre className="code-panel" aria-label={`${visualization.sprak ?? "Program"}-kode`}><code>{String(visualization.kode ?? "")}</code></pre>;
  }
  if (type === "tabell") {
    const columns = (visualization.kolonner as string[]) ?? [];
    const rows = (visualization.rader as unknown[][]) ?? [];
    const entries = columns.map((column, columnIndex) => [
      column,
      rows.map((row) => row[columnIndex]),
    ] as [string, unknown[]]);
    return (
      <div className="data-panel">
        <DataTable entries={entries} />
      </div>
    );
  }
  if (type === "figurmønster") {
    const figures = (visualization.figurer as { n: number; antall: number }[] | undefined) ?? [];
    const values = (visualization.verdier as number[] | undefined) ?? figures.map((figure) => figure.antall);
    return (
      <figure className="visual-card pattern-card" aria-label={visualization.tekstalternativ ?? "Figurmønster"}>
        {values.map((value, index) => <div key={index}><div className="pattern-dots">{Array.from({ length: Math.min(value, 30) }, (_, dot) => <i key={dot} />)}</div><small>Figur {figures[index]?.n ?? index + 1}: {value}</small></div>)}
      </figure>
    );
  }
  if (type === "gruppert_søylediagram") {
    return <BarChart labels={(visualization.kategorier as string[]) ?? []} series={((visualization.serier as { navn: string; verdier: number[] }[]) ?? []).map((item) => ({ name: item.navn, values: item.verdier }))} description="Gruppert søylediagram" />;
  }
  if (type === "histogramdata") {
    const limits = (visualization.klassegrenser as number[]) ?? [];
    const values = (visualization.frekvenser as number[]) ?? [];
    return <Histogram limits={limits} frequencies={values} useDensity={Boolean(visualization.bruk_frekvenstetthet)} />;
  }
  if (type === "prosentforløp") {
    return <BarChart labels={(visualization.etiketter as string[]) ?? []} series={[{ name: "Verdi", values: (visualization.verdier as number[]) ?? [] }]} description="Verdier gjennom to prosentendringer" />;
  }
  if (type === "sammenlignende_punktdiagram") {
    const series = ((visualization.serier as { navn: string; verdier: number[] }[]) ?? []).map((item) => ({ name: item.navn, points: item.verdier.map((y, index) => ({ x: index + 1, y })), connect: false }));
    return <Plot series={series} description="Sammenlignende punktdiagram" />;
  }
  if (["punktdiagram", "spredningsdiagram"].includes(type)) {
    const xs = (visualization.x as number[]) ?? [];
    const ys = (visualization.y as number[]) ?? [];
    return <Plot series={[{ name: "Data", points: xs.map((x, index) => ({ x, y: ys[index] })), connect: type === "punktdiagram" && Boolean(visualization.forbind_punkter) }]} description={type === "spredningsdiagram" ? "Spredningsdiagram" : "Punktdiagram"} />;
  }
  if (type === "funksjonsgraf" || type === "funksjonsgrafer") {
    const min = Number(visualization.x_min ?? 0);
    const max = Number(visualization.x_max ?? 10);
    const graphs = (visualization.grafer as { uttrykk: string; etikett: string }[]) ?? [];
    const series = graphs.map((graph) => {
      const calculate = functionFromExpression(graph.uttrykk);
      const points = calculate ? Array.from({ length: 31 }, (_, index) => { const x = min + ((max - min) * index) / 30; return { x, y: calculate(x) }; }) : [];
      return { name: `${graph.etikett}: ${graph.uttrykk}`, points };
    });
    return <Plot series={series} description="Funksjonsgraf" />;
  }
  if (type === "omvendt_proporsjonal_graf") {
    const min = Number(visualization.x_min ?? 1);
    const max = Number(visualization.x_max ?? 15);
    const fixed = Number(visualization.fast_ledd ?? 0);
    const observation = data?.observasjon as { x?: number; T?: number } | undefined;
    const k = observation?.x && observation?.T ? observation.x * (observation.T - fixed) : 1;
    const points = Array.from({ length: 31 }, (_, index) => { const x = min + ((max - min) * index) / 30; return { x, y: k / x + fixed }; });
    return <Plot series={[{ name: `T(x) = ${k}/x + ${fixed}`, points }]} description="Graf for en omvendt proporsjonal modell" />;
  }
  return null;
}
