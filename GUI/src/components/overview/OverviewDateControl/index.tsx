import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MdChevronLeft, MdChevronRight, MdOutlineCalendarMonth } from 'react-icons/md';
import Icon from '../../Icon';
import Track from '../../Track';
import { FormDatepicker } from '../../FormElements';
import { DateRange, OverviewUnit, shiftAnchor } from '../../../util/overview-date-utils';
import './styles.scss';

type Props = {
  readonly unit: OverviewUnit;
  readonly anchorDate: Date;
  readonly range: DateRange;
  readonly onUnitChange: (unit: OverviewUnit) => void;
  readonly onAnchorChange: (date: Date) => void;
};

const units: OverviewUnit[] = ['day', 'week', 'month'];
const noop = () => undefined;
const calendarIcon = <MdOutlineCalendarMonth fontSize={16} />;

const OverviewDateControl = ({ unit, anchorDate, range, onUnitChange, onAnchorChange }: Props) => {
  const { t } = useTranslation();

  return (
    <Track gap={6} className="overview-date-control">
      <div className="overview-date-control__units" role="group">
        {units.map((u) => (
          <button
            key={u}
            type="button"
            className={clsx(
              'overview-date-control__unit',
              u === unit && 'overview-date-control__unit--active',
            )}
            aria-pressed={u === unit}
            onClick={() => onUnitChange(u)}
          >
            {t(`overview.${u}`)}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="overview-date-control__arrow"
        onClick={() => onAnchorChange(shiftAnchor(unit, anchorDate, -1))}
        aria-label="previous"
      >
        <Icon icon={<MdChevronLeft />} size="small" />
      </button>

      <Track gap={4} className="overview-date-control__dates">
        <FormDatepicker
          label="start"
          name="overview-start-date"
          hideLabel
          value={range.start}
          trailingIcon={calendarIcon}
          onChange={(date: Date | null) => date && onAnchorChange(date)}
          onBlur={noop}
          ref={noop}
        />
        <span>-</span>
        <FormDatepicker
          label="end"
          name="overview-end-date"
          hideLabel
          value={range.end}
          trailingIcon={calendarIcon}
          onChange={(date: Date | null) => date && onAnchorChange(date)}
          onBlur={noop}
          ref={noop}
        />
      </Track>

      <button
        type="button"
        className="overview-date-control__arrow"
        onClick={() => onAnchorChange(shiftAnchor(unit, anchorDate, 1))}
        aria-label="next"
      >
        <Icon icon={<MdChevronRight />} size="small" />
      </button>
    </Track>
  );
};

export default OverviewDateControl;
