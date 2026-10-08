import React, { useEffect, useState } from 'react';

interface CreatableSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const CUSTOM_KEY = '__CUSTOM_INPUT__';

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'ພິມລາຍລະອຽດເພີ່ມເຕີມດ້ວຍຕົນເອງ...',
  required = false,
  className = '',
}) => {
  const isValueInOptions = options.includes(value);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(
    Boolean(value && !isValueInOptions)
  );

  useEffect(() => {
    if (value && !options.includes(value)) {
      setIsCustomMode(true);
    }
  }, [value, options]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === CUSTOM_KEY) {
      setIsCustomMode(true);
      onChange('');
    } else {
      setIsCustomMode(false);
      onChange(selected);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label} {required ? '*' : ''}
        </label>
      )}
      <select
        value={isCustomMode ? CUSTOM_KEY : isValueInOptions ? value : options[0] || CUSTOM_KEY}
        onChange={handleSelectChange}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-teal-600"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={CUSTOM_KEY}>+ ພິມເພີ່ມເອງ / ອື່ນໆ (Type Custom)...</option>
      </select>

      {isCustomMode && (
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm bg-white border border-teal-500 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
      )}
    </div>
  );
};
