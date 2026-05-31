import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(annotationPlugin);

interface GraphProps {
  samples: number[];
  threshold: number;
  historySeconds: number;
}

export function Graph({ samples, threshold, historySeconds }: GraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const maxSamples = Math.floor(historySeconds * 10); // 10 samples/s

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: Array.from({ length: maxSamples }, (_, i) => i),
        datasets: [
          {
            data: Array(maxSamples).fill(null),
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            spanGaps: false,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: {
            min: 30,
            max: 115,
            ticks: { color: '#666666', stepSize: 10 },
            grid: { color: 'rgba(255,255,255,0.08)' },
            border: { color: 'rgba(255,255,255,0.2)' },
          },
        },
        plugins: {
          legend: { display: false },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          annotation: {
            annotations: {
              thresholdLine: {
                type: 'line',
                yMin: threshold,
                yMax: threshold,
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderDash: [8, 4],
                label: {
                  display: true,
                  content: `${threshold} dBA`,
                  position: 'end',
                  color: '#f59e0b',
                  backgroundColor: 'transparent',
                  font: { size: 11, family: 'system-ui' },
                },
              },
            },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data and annotations on each render
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const newMaxSamples = Math.floor(historySeconds * 10);

    // Left-pad with null so data fills in from the right
    const padded: (number | null)[] = Array(Math.max(0, newMaxSamples - samples.length))
      .fill(null)
      .concat(samples);

    chart.data.labels = Array.from({ length: newMaxSamples }, (_, i) => i);
    chart.data.datasets[0].data = padded;

    // Update threshold annotation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ann = (chart.options.plugins as any).annotation.annotations.thresholdLine;
    ann.yMin = threshold;
    ann.yMax = threshold;
    ann.label.content = `${threshold} dBA`;

    chart.update('none');
  }, [samples, threshold, historySeconds]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
