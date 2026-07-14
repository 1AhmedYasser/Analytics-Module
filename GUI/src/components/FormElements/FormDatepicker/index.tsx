import React, { forwardRef, useId, ReactNode } from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import clsx from 'clsx';
import { et } from 'date-fns/locale';
import { ControllerRenderProps } from 'react-hook-form';
import { MdChevronRight, MdChevronLeft, MdOutlineToday, MdOutlineSchedule } from 'react-icons/md';

import { Icon } from '../../../components';
import 'react-datepicker/dist/react-datepicker.css';
import './FormDatepicker.scss';
import i18next from 'i18next';

registerLocale('et-EE', et);

type FormDatepickerProps = ControllerRenderProps & {
  label: string;
  name: string;
  hideLabel?: boolean;
  disabled?: boolean;
  placeholder?: string;
  timePicker?: boolean;
  monthPicker?: boolean;
  portalId?: string;
  trailingIcon?: ReactNode;
}

const FormDatepicker = forwardRef<any, FormDatepickerProps>((
  {
    label,
    name,
    hideLabel,
    disabled,
    placeholder,
    timePicker,
    monthPicker,
    portalId = 'overlay-root',
    trailingIcon,
    ...rest
  },
  ref,
) => {
  const id = useId();
  const { value, onChange } = rest;

  const datepickerClasses = clsx(
    'datepicker',
    disabled && 'datepicker--disabled',
  );

  let format = 'dd.MM.yyyy'
  if (monthPicker)
    format = 'MMMM'
  else if (timePicker)
    format = 'hh:mm:ss'

  return (
    <div className={datepickerClasses}>
      {label && !hideLabel && <label htmlFor={id} className='datepicker__label'>{label}</label>}
      <div className='datepicker__wrapper'>
        <ReactDatePicker
          selected={new Date(value)}
          dateFormat={format}
          locale={i18next.language === 'et' ? "et-EE" : "en"}
          placeholderText={placeholder}
          previousMonthButtonLabel={<MdChevronLeft />}
          nextMonthButtonLabel={<MdChevronRight />}
          aria-label={hideLabel ? label : undefined}
          showTimeSelect={timePicker}
          showTimeSelectOnly={timePicker}
          timeIntervals={15}
          timeFormat='hh:mm:ss'
          timeInputLabel=''
          portalId={portalId}
          showMonthYearPicker={monthPicker}
          {...rest}
          onChange={onChange}
        />
        <Icon
          icon={trailingIcon ?? (timePicker
            ? (<MdOutlineSchedule color='#5D6071' fontSize={20} />)
            : (<MdOutlineToday color='#5D6071' fontSize={20} />)
          )}
          size={trailingIcon ? 'small' : 'medium'}
        />
      </div>
    </div>
  );
});

FormDatepicker.displayName = 'formDatepicker'

export default FormDatepicker;
