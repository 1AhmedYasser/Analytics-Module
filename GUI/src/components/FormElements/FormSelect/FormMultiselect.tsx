import React, { FC, ReactNode, SelectHTMLAttributes, useId, useState } from 'react';
import { useSelect } from 'downshift';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MdArrowDropDown } from 'react-icons/md';

import { Icon } from '../..';
import './FormSelect.scss';
import CheckBoxWithColorIndicator from 'components/MetricAndPeriodOptions/CheckboxWithColorIndicator';

export type SelectOption = { label: string, value: string, color?: string };

type FormMultiselectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label: ReactNode;
    name: string;
    placeholder?: string;
    hideLabel?: boolean;
    options: SelectOption[];
    selectedOptions?: SelectOption[];
    enableSelectAll?: boolean;
    onSelectionChange?: (selection: SelectOption[] | null) => void;
};

const FormMultiselect: FC<FormMultiselectProps> = (
    {
        label,
        hideLabel,
        options,
        disabled,
        placeholder,
        defaultValue,
        selectedOptions,
        enableSelectAll,
        onSelectionChange,
        ...rest
    },
) => {
    const id = useId();
    const { t } = useTranslation();
    const [selectedItems, setSelectedItems] = useState<SelectOption[]>(selectedOptions ?? []);
    const {
        isOpen,
        getToggleButtonProps,
        getLabelProps,
        getMenuProps,
        highlightedIndex,
        getItemProps,
    } = useSelect({
        items: options,
        stateReducer: (state, actionAndChanges) => {
            const { changes, type } = actionAndChanges;
            if (type === useSelect.stateChangeTypes.ItemClick) {
                return {
                    ...changes,
                    isOpen: true,
                    highlightedIndex: state.highlightedIndex,
                };
            } else {
                return changes;
            }
        },
        selectedItem: null,
        onSelectedItemChange: ({ selectedItem }) => {
            if (!selectedItem) {
                return;
            }
            const index = selectedItems.findIndex((item) => item.value === selectedItem.value);
            const items = [];
            if (index > 0) {
                items.push(
                    ...selectedItems.slice(0, index),
                    ...selectedItems.slice(index + 1)
                );
            } else if (index === 0) {
                items.push(...selectedItems.slice(1));
            } else {
                items.push(...selectedItems, selectedItem);
            }
            setSelectedItems(items);
            if (onSelectionChange) onSelectionChange(items);
        },
    });

    const selectClasses = clsx(
        'analytics-select',
        disabled && 'analytics-select--disabled',
    );

    const placeholderValue = placeholder ?? t('global.choose');

    const isAllSelected = options.length > 0 && options.every((option) => selectedItems.includes(option));

    const handleSelectAll = (isChecked: boolean) => {
      setSelectedItems(isChecked ? options : []);
    };

    return (
      <div
        className={selectClasses}
        style={rest.style}
      >
        {label && !hideLabel && (
          <label
            htmlFor={id}
            className="analytics-select__label"
            {...getLabelProps()}
          >
            {label}
          </label>
        )}
        <div className="analytics-select__wrapper">
          <div
            className="analytics-select__trigger"
            {...getToggleButtonProps()}
          >
            {selectedItems.length > 0
              ? `${placeholder ?? t('global.chosen')} (${selectedItems.length})`
              : placeholderValue}
            <Icon
              label="Dropdown icon"
              size="medium"
              icon={<MdArrowDropDown color="#5D6071" />}
            />
          </div>

          <ul
            className="analytics-select__menu"
            {...getMenuProps()}
          >
            {enableSelectAll && (
              <li
                key={`select-all`}
                className={clsx('analytics-select__option', { 'analytics-select__option--selected': highlightedIndex === -1 })}
                {...getItemProps({
                  item: { label: 'select-all', value: 'select-all' },
                  index: -1,
                })}
              >
                <CheckBoxWithColorIndicator
                  key="select-all"
                  color="transparent"
                  label={t('general.selectAll')}
                  selected={isAllSelected}
                  onClick={() => handleSelectAll(!isAllSelected)}
                />
              </li>
            )}
            {isOpen &&
              options.map((item, index) => (
                <li
                  key={`${item.label}-${index}`}
                  className={clsx('analytics-select__option', { 'analytics-select__option--selected': highlightedIndex === index })}
                  {...getItemProps({
                    item,
                    index,
                  })}
                >
                  <CheckBoxWithColorIndicator
                    key={item.value}
                    color={item.color}
                    label={t(item.label)}
                    selected={selectedItems.map((s) => s.value).includes(item.value)}
                    onClick={() => null}
                  />
                </li>
              ))}
          </ul>
        </div>
      </div>
    );
};


export default FormMultiselect;
