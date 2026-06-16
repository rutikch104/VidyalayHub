// @ts-nocheck
import { Children, isValidElement } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Radix Select reserves "" for clearing — map native empty values to this sentinel. */
const EMPTY_VALUE_SENTINEL = '__vh_select_empty__';

function toRadixValue(value) {
  return value === '' ? EMPTY_VALUE_SENTINEL : String(value);
}

function fromRadixValue(value) {
  return value === EMPTY_VALUE_SENTINEL ? '' : value;
}

function parseOptions(children) {
  const options = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    const rawValue = child.props.value ?? '';
    options.push({
      value: rawValue,
      radixValue: toRadixValue(rawValue),
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    });
  });
  return options;
}

/**
 * Premium Radix select — drop-in replacement for native `<select>` with option children.
 */
export default function PlatformSelect({
  id,
  className = '',
  error = false,
  children,
  value,
  onChange,
  disabled,
  name,
  placeholder,
  'aria-label': ariaLabel,
  ...props
}) {
  const options = parseOptions(children);
  const emptyOption = options.find((o) => o.value === '');
  const placeholderText =
    placeholder ||
    (typeof emptyOption?.label === 'string' ? emptyOption.label : 'Select an option');

  const stringValue = value == null ? '' : String(value);
  const radixValue = toRadixValue(stringValue);
  const hasValue = options.some((o) => o.radixValue === radixValue);
  const selectValue = hasValue ? radixValue : undefined;

  const handleValueChange = (next) => {
    onChange?.({ target: { value: fromRadixValue(next), name } });
  };

  return (
    <SelectPrimitive.Root
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      name={name}
      {...props}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'vh-select-trigger',
          error && 'vh-select-trigger--error',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholderText} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="vh-select-trigger__chevron h-4 w-4" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="vh-select-content"
          position="popper"
          sideOffset={6}
          align="start"
          collisionPadding={12}
        >
          <SelectPrimitive.Viewport className="vh-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.radixValue}
                value={option.radixValue}
                disabled={option.disabled}
                className="vh-select-item"
              >
                <SelectPrimitive.ItemIndicator className="vh-select-item__check">
                  <Check className="h-4 w-4" aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText className="vh-select-item__text">
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
