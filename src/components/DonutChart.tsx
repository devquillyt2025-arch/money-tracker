import React, { useState } from 'react';

interface CategorySegment {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  categoryData: { name: string; amount: number }[];
}

export default function DonutChart({ categoryData }: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter to keep only categories with amount > 0
  const activeCategories = categoryData
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = activeCategories.reduce((sum, item) => sum + item.amount, 0);

  // Group to maximum 3 segments as instructed: Gold, Sage, Neutral (Others)
  let segments: CategorySegment[] = [];

  if (activeCategories.length > 0) {
    if (activeCategories.length <= 2) {
      // Just map them to Gold and Sage Green
      segments = activeCategories.map((cat, idx) => ({
        name: cat.name,
        amount: cat.amount,
        percentage: total > 0 ? (cat.amount / total) * 100 : 0,
        color: idx === 0 ? '#E0BD7D' : '#6FAE98'
      }));
    } else {
      // Top 1 is Blue, Top 2 is Green, rest are Gray grouped as "Others"
      const top1 = activeCategories[0];
      const top2 = activeCategories[1];
      const othersAmount = activeCategories.slice(2).reduce((sum, cat) => sum + cat.amount, 0);

      segments = [
        {
          name: top1.name,
          amount: top1.amount,
          percentage: (top1.amount / total) * 100,
          color: '#2563eb' // blue-600
        },
        {
          name: top2.name,
          amount: top2.amount,
          percentage: (top2.amount / total) * 100,
          color: '#22c55e' // green-500
        },
        {
          name: 'Others',
          amount: othersAmount,
          percentage: (othersAmount / total) * 100,
          color: '#e5e7eb' // gray-200
        }
      ].filter(s => s.amount > 0);
    }
  }

  // Circle properties
  const radius = 35;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius; // ~219.91

  let accumulatedPercentage = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
      {/* Donut graphic */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {total === 0 ? (
          <div className="text-center font-sans text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
            No data
          </div>
        ) : (
          <>
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 select-none overflow-visible">
              {/* Backing circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#f3f4f6"
                strokeWidth={strokeWidth}
              />

              {segments.map((seg, idx) => {
                const strokeLength = (seg.percentage / 100) * circumference;
                const strokeOffset = circumference - (accumulatedPercentage / 100) * circumference;
                accumulatedPercentage += seg.percentage;

                const isHovered = hoveredIdx === idx;

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                    strokeDasharray={`${strokeLength} ${circumference}`}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      strokeOpacity: hoveredIdx === null || isHovered ? 1 : 0.6,
                    }}
                  />
                );
              })}
            </svg>

            {/* Inner text area */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate w-full">
                {hoveredIdx !== null ? segments[hoveredIdx].name : 'Total'}
              </span>
              <span className="font-sans text-sm font-bold text-gray-900 dark:text-gray-50 mt-0.5">
                ₹{(hoveredIdx !== null ? segments[hoveredIdx].amount : total).toLocaleString('en-IN')}
              </span>
              {hoveredIdx !== null && (
                <span className="font-sans font-medium text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                  {segments[hoveredIdx].percentage.toFixed(0)}%
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Legend list */}
      <div className="flex-1 w-full space-y-3 font-sans">
        <h4 className="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800/50 pb-2 mb-3">
          Category Distribution
        </h4>
        {segments.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 italic font-medium">No active expenditure.</div>
        ) : (
          <div className="space-y-2">
            {segments.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-1.5 rounded-md transition-all duration-150 ${
                    isHovered ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className={`text-sm font-medium ${isHovered ? 'text-gray-900 dark:text-gray-50' : 'text-gray-600 dark:text-gray-300'}`}>
                      {seg.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-sans text-sm">
                    <span className="font-semibold text-gray-900 dark:text-gray-50">₹{seg.amount.toLocaleString('en-IN')}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs w-8 text-right font-medium">
                      {seg.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
