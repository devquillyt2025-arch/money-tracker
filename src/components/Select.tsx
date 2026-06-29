import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  id?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  error = false,
  id
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = id ? `${id}-listbox` : undefined;

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      // Check if clicking inside the trigger OR inside the portal
      const listbox = document.getElementById(listboxId || 'select-listbox-portal');
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        (!listbox || !listbox.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [listboxId]);

  useEffect(() => {
    if (isOpen) {
      const index = options.findIndex(opt => opt.value === value);
      setHighlightedIndex(index !== -1 ? index : 0);
      
      if (containerRef.current) {
        setRect(containerRef.current.getBoundingClientRect());
      }
      
      const handleScroll = () => {
        if (containerRef.current) {
          setRect(containerRef.current.getBoundingClientRect());
        }
      };
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen, value, options]);

  const handleSelect = (selectedValue: string) => {
    onChange({ target: { value: selectedValue } });
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (options[highlightedIndex]) {
            handleSelect(options[highlightedIndex].value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  // Determine base styles if className doesn't override fully, while keeping passed className
  const defaultBaseClasses = "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans font-medium flex items-center justify-between gap-2 cursor-pointer shadow-sm";
  
  // Combine passed className with essential flex and button styling
  const triggerClassName = `${className || defaultBaseClasses} ${
    error ? 'border-red-500 dark:border-red-500 ring-1 ring-red-500' : ''
  } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-between gap-2`;

  return (
    <div className="relative w-full font-sans" ref={containerRef}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={triggerClassName}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && rect && createPortal(
        <ul
          id={listboxId || 'select-listbox-portal'}
          role="listbox"
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          }}
          className="z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1 origin-top animate-in fade-in-80 zoom-in-95 transition-all"
        >
          {options.map((opt, index) => {
            const isSelected = value === opt.value;
            const isHighlighted = highlightedIndex === index;

            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 text-sm font-sans font-medium cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                  isHighlighted
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50'
                    : 'text-gray-700 dark:text-gray-300'
                } ${isSelected ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
}
