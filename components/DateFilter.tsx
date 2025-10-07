import React from 'react';

interface DateFilterProps {
  dateRange: { start: string | null; end: string | null };
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void;
  minDate?: string;
  maxDate?: string;
}

export const DateFilter: React.FC<DateFilterProps> = ({ dateRange, onDateRangeChange, minDate, maxDate }) => {

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateRangeChange({ ...dateRange, start: e.target.value || null });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateRangeChange({ ...dateRange, end: e.target.value || null });
  };
  
  const handleClear = () => {
    onDateRangeChange({ start: null, end: null });
  };

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filter by Date Range</h3>
        <button onClick={handleClear} className="text-xs font-medium text-gray-400 hover:text-gray-300">Clear</button>
      </div>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
        <div className="flex-1">
          <label htmlFor="start-date" className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
          <input
            type="date"
            id="start-date"
            value={dateRange.start || ''}
            onChange={handleStartDateChange}
            min={minDate}
            max={maxDate}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ colorScheme: 'dark' }}
            title="Select the start date for filtering"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="end-date" className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            id="end-date"
            value={dateRange.end || ''}
            onChange={handleEndDateChange}
            min={dateRange.start || minDate}
            max={maxDate}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ colorScheme: 'dark' }}
            title="Select the end date for filtering"
          />
        </div>
      </div>
    </div>
  );
};