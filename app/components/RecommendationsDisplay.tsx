'use client';

import type { EmailRecommendation } from '@/lib/types/email';

interface RecommendationsDisplayProps {
  recommendations: EmailRecommendation[];
}

export function RecommendationsDisplay({
  recommendations,
}: RecommendationsDisplayProps) {
  const byPriority = {
    high: recommendations.filter((r) => r.priority === 'high'),
    medium: recommendations.filter((r) => r.priority === 'medium'),
    low: recommendations.filter((r) => r.priority === 'low'),
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Safety Recommendations
      </h3>
      <div className="space-y-4">
        {byPriority.high.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-red-600">
              High Priority
            </h4>
            <ul className="space-y-2">
              {byPriority.high.map((rec, idx) => (
                <li
                  key={idx}
                  className="rounded border-l-4 border-red-500 bg-red-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {rec.description}
                      </p>
                      {rec.explanation && (
                        <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 p-2">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Explanation:</p>
                          <p className="text-xs text-blue-800">
                            {rec.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                    {rec.category && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        {rec.category}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {byPriority.medium.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-amber-600">
              Medium Priority
            </h4>
            <ul className="space-y-2">
              {byPriority.medium.map((rec, idx) => (
                <li
                  key={idx}
                  className="rounded border-l-4 border-amber-500 bg-amber-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {rec.description}
                      </p>
                      {rec.explanation && (
                        <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 p-2">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Explanation:</p>
                          <p className="text-xs text-blue-800">
                            {rec.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                    {rec.category && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        {rec.category}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {byPriority.low.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-green-600">
              Additional Recommendations
            </h4>
            <ul className="space-y-2">
              {byPriority.low.map((rec, idx) => (
                <li
                  key={idx}
                  className="rounded border-l-4 border-green-500 bg-green-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {rec.description}
                      </p>
                      {rec.explanation && (
                        <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 p-2">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Explanation:</p>
                          <p className="text-xs text-blue-800">
                            {rec.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                    {rec.category && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {rec.category}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

