import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import Button from '../../Button';
import Icon from '../../Icon';
import Track from '../../Track';
import { FormDatepicker } from '../../FormElements';
import { DateRange, OverviewUnit, shiftAnchor } from '../../../util/overview-date-utils';
import './styles.scss';

type Props = {
  unit: OverviewUnit;
  anchorDate: Date;
  range: DateRange;
  onUnitChange: (unit: OverviewUnit) => void;
  onAnchorChange: (date: Date) => void;
};

const units: OverviewUnit[] = ['day', 'week', 'month'];
const noop = () => undefined;

const OverviewDateControl = ({ unit, anchorDate, range, onUnitChange, onAnchorChange }: Props) => {
  const { t } = useTranslation();

  return (
    <Track gap={8} className="overview-date-control">
      <Track gap={4}>
        {units.map((u) => (
          <Button
            key={u}
            appearance={u === unit ? 'primary' : 'secondary'}
            size="s"
            onClick={() => onUnitChange(u)}
          >
            {t(`overview.${u}`)}
          </Button>
        ))}
      </Track>

      <button
        type="button"
        className="overview-date-control__arrow"
        onClick={() => onAnchorChange(shiftAnchor(unit, anchorDate, -1))}
        aria-label="previous"
      >
        <Icon icon={<MdChevronLeft />} size="medium" />
      </button>

      <Track gap={4} className="overview-date-control__dates">
        <FormDatepicker
          label="start"
          name="overview-start-date"
          hideLabel
          value={range.start}
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
        <Icon icon={<MdChevronRight />} size="medium" />
      </button>
    </Track>
  );
};

export default OverviewDateControl;
