import React, { useState, useRef, useEffect } from 'react';

interface BarData {
  month: string;
  amount: number;
  isCurrent?: boolean;
  isComparison?: boolean;
}

interface BarChartProps {
  data: BarData[];
  title?: string;
}

export default function BarChart({ data, title }: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      setContainerWidth(entries[0].contentRect.width || 400);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const height = 200;
  const paddingLeft = 65;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.amount), 50000);
  // Round max value to nice interval
  const roundMax = Math.ceil(maxVal / 25000) * 25000;

  const formatRupee = (value: number) => {
    return `₹${(value / 1000).toFixed(0)}k`;
  };

  const getBarColor = (item: BarData) => {
    if (item.isCurrent) return '#2563eb'; // blue-600
    if (item.isComparison) return '#22c55e'; // green-500
    return '#e5e7eb'; // gray-200
  };

  // 4 Y-axis labels
  const yTicks = [0, roundMax * 0.33, roundMax * 0.66, roundMax];

  return (
    <div ref={containerRef} className="w-full relative">
      <svg width="100%" height={height} className="overflow-visible select-none">
        {/* Horizontal grid lines */}
        {yTicks.map((tick, idx) => {
          const y = paddingTop + chartHeight - (tick / roundMax) * chartHeight;
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + chartWidth}
                y2={y}
                stroke="#f3f4f6" // gray-100
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 10}
                y={y + 3}
                fill="#9ca3af" // gray-400
                fontSize={10}
                fontFamily="Inter, ui-sans-serif, system-ui"
                fontWeight="500"
                textAnchor="end"
              >
                {formatRupee(tick)}
              </text>
            </g>
          );
        })}

        {/* Render Bars */}
        {data.map((item, idx) => {
          const barWidth = Math.min(32, (chartWidth / data.length) * 0.55);
          const gap = (chartWidth / data.length);
          const x = paddingLeft + idx * gap + (gap - barWidth) / 2;
          
          const barHeight = (item.amount / roundMax) * chartHeight;
          const y = paddingTop + chartHeight - barHeight;

          const isHovered = hoveredIndex === idx;

          return (
            <g 
              key={idx} 
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Invisible trigger bar for easy hover */}
              <rect
                x={paddingLeft + idx * gap}
                y={paddingTop}
                width={gap}
                height={chartHeight}
                fill="transparent"
              />

              {/* Main visual bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(1, barHeight)}
                fill={getBarColor(item)}
                rx={4}
                className="transition-all duration-300"
                style={{
                  fillOpacity: isHovered ? 1 : 0.85,
                }}
              />

              {/* Highlight hover border */}
              {isHovered && (
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={barWidth + 4}
                  height={Math.max(1, barHeight) + 4}
                  fill="none"
                  stroke="#93c5fd" // blue-300
                  strokeWidth={1.5}
                  rx={6}
                  className="pointer-events-none transition-all"
                />
              )}

              {/* X-axis labels */}
              <text
                x={x + barWidth / 2}
                y={height - 10}
                fill={isHovered ? '#111827' : '#9ca3af'}
                fontSize={10}
                fontFamily="Inter, ui-sans-serif, system-ui"
                fontWeight="600"
                textAnchor="middle"
                className="transition-colors duration-150"
              >
                {item.month}
              </text>
            </g>
          );
        })}

        {/* Base axis line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="#f3f4f6"
          strokeWidth={1.5}
        />
      </svg>

      {/* Floating Tooltip HTML over SVG */}
      {hoveredIndex !== null && (
        <div 
          className="absolute z-10 bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl shadow-xl pointer-events-none text-xs font-sans"
          style={{
            left: `${Math.min(
              containerWidth - 140, 
              paddingLeft + hoveredIndex * (chartWidth / data.length) + 10
            )}px`,
            top: `${Math.max(10, paddingTop)}px`,
          }}
        >
          <div className="text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">
            {data[hoveredIndex].month} Spend
          </div>
          <div className="text-white font-bold text-sm">
            ₹{data[hoveredIndex].amount.toLocaleString('en-IN')}
          </div>
          {data[hoveredIndex].isCurrent && (
            <div className="text-blue-400 text-[9px] mt-1 uppercase tracking-wider font-semibold">
              Current Month
            </div>
          )}
          {data[hoveredIndex].isComparison && (
            <div className="text-green-400 text-[9px] mt-1 uppercase tracking-wider font-semibold">
              Comparison Target
            </div>
          )}
        </div>
      )}
    </div>
  );
}
