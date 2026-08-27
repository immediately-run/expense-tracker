interface Props {
  options: string[];
  value: string | string[];
  onToggle: (name: string) => void;
  wrap?: boolean;
}

/** Single- or multi-select chips; `value` as an array means multi-select. */
function CategoryChips({ options, value, onToggle, wrap }: Props) {
  const isOn = (name: string) => (Array.isArray(value) ? value.includes(name) : value === name);
  return (
    <div className={`chips ${wrap ? 'wrap' : ''}`} role="listbox" aria-multiselectable={Array.isArray(value)}>
      {options.map((name) => (
        <button
          key={name}
          type="button"
          role="option"
          aria-selected={isOn(name)}
          className={`chip ${isOn(name) ? 'on' : ''}`}
          onClick={() => onToggle(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export default CategoryChips;
