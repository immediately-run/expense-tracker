import { currentMonth, monthLabel, shiftMonth } from '../lib/dates';
import Icon from './Icon';

interface Props {
  month: string;
  onChange: (ym: string) => void;
}

function MonthPicker({ month, onChange }: Props) {
  const now = currentMonth();
  return (
    <div className="monthpicker">
      <button type="button" className="iconbtn" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        <Icon name="left" />
      </button>
      <div className="label">{monthLabel(month)}</div>
      {month !== now && (
        <button type="button" className="today" onClick={() => onChange(now)}>
          today
        </button>
      )}
      <button type="button" className="iconbtn" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>
        <Icon name="right" />
      </button>
    </div>
  );
}

export default MonthPicker;
