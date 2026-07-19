import React, { FC, SelectHTMLAttributes, useEffect, useId } from 'react';
import { useMultipleSelection, useSelect } from 'downshift';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { MdArrowDropDown } from 'react-icons/md';

import { Icon } from '../..';
import './FormSelect.scss';

type FormSelectMultipleProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string[];
  options: {
    label: string;
    value: string;
  }[];
  onSelectionChange?: (selection: { label: string; value: string }[]) => void;
};

const FormSelectMultiple: FC<FormSelectMultipleProps> = ({
  label,
  options,
  disabled,
  placeholder,
  defaultValue,
  onSelectionChange,
}) => {
  const id = useId();
  const { t } = useTranslation();
  const { isOpen, getToggleButtonProps, getLabelProps, getMenuProps, getItemProps } = useSelect({
    id,
    items: options,
    selectedItem: null,
    defaultHighlightedIndex: 0,
    stateReducer: (_, actionAndChanges) => {
      const { changes, type } = actionAndChanges;
      switch (type) {
        case useSelect.stateChangeTypes.ToggleButtonKeyDownEnter:
        case useSelect.stateChangeTypes.ToggleButtonKeyDownSpaceButton:
        case useSelect.stateChangeTypes.ItemClick:
          return {
            ...changes,
            isOpen: true, // keep the menu open after selection.
          };
      }
      return changes;
    },
    onStateChange: ({ type, selectedItem }) => {
      switch (type) {
        case useSelect.stateChangeTypes.ToggleButtonKeyDownEnter:
        case useSelect.stateChangeTypes.ToggleButtonKeyDownSpaceButton:
        case useSelect.stateChangeTypes.ItemClick:
          if (selectedItem) {
            const existingItem = selectedItems.find((o) => o.value === selectedItem.value);
            if (existingItem) {
              removeSelectedItem(existingItem);
            } else {
              addSelectedItem(selectedItem);
            }
          }
          break;
        default:
          break;
      }
    },
  });
  const { addSelectedItem, removeSelectedItem, selectedItems, getDropdownProps, setSelectedItems } =
    useMultipleSelection<{
      label: string;
      value: string;
    }>();

  useEffect(() => {
    if (onSelectionChange) onSelectionChange(selectedItems);
  }, [selectedItems]);

  useEffect(() => {
    setSelectedItems(options.filter((o) => defaultValue?.includes(String(o.value))));
  }, []);

  const selectClasses = clsx('analytics-select', disabled && 'analytics-select--disabled');

  const placeholderValue = placeholder || t('global.choose');

  return (
    <div className={selectClasses}>
      {label && (
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
          {...getToggleButtonProps(getDropdownProps({ preventKeyAction: isOpen }))}
        >
          {selectedItems.map((i) => i.label).join(', ') || placeholderValue}
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
          {isOpen &&
            options.map((item, index) => (
              <li
                className={clsx('analytics-select__option', {
                  'analytics-select__option--selected': selectedItems.find((i) => i.value === item.value),
                })}
                key={`${item.value}${index}`}
                {...getItemProps({ item, index })}
              >
                {item.label}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default FormSelectMultiple;
