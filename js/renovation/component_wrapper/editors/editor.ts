import Component from '../common/component';
import ValidationEngine from '../../../ui/validation_engine';
import { extend } from '../../../core/utils/extend';
// eslint-disable-next-line import/named
import $, { dxElementWrapper } from '../../../core/renderer';
import { data } from '../../../core/element_data';
import Callbacks from '../../../core/utils/callbacks';
import OldEditor from '../../../ui/editor/editor';
import { Option } from '../common/types';
import { addAttributes, getAriaName } from '../utils/utils';

const INVALID_MESSAGE_AUTO = 'dx-invalid-message-auto';
const VALIDATION_TARGET = 'dx-validation-target';

export default class Editor extends Component {
  showValidationMessageTimeout?: ReturnType<typeof setTimeout>;

  validationRequest!: ReturnType<typeof Callbacks>;

  // eslint-disable-next-line @typescript-eslint/ban-types
  _valueChangeAction!: Function;

  _valueChangeEventInstance?: Event;

  getProps(): Record<string, unknown> {
    const props = super.getProps();
    props.onFocusIn = (): void => {
      const isValidationMessageShownOnFocus = this.option('validationMessageMode') === 'auto';

      // NOTE: The click should be processed before the validation message is shown because
      // it can change the editor's value
      if (isValidationMessageShownOnFocus) {
        // NOTE: Prevent the validation message from showing
        const $validationMessageWrapper = $('.dx-invalid-message.dx-overlay-wrapper');
        $validationMessageWrapper?.removeClass(INVALID_MESSAGE_AUTO);

        const timeToWaitBeforeShow = 150;
        if (this.showValidationMessageTimeout) {
          clearTimeout(this.showValidationMessageTimeout);
        }

        // NOTE: Show the validation message after a click changes the value
        this.showValidationMessageTimeout = setTimeout(() => {
          $validationMessageWrapper?.addClass(INVALID_MESSAGE_AUTO);
        }, timeToWaitBeforeShow);
      }
    };
    props.saveValueChangeEvent = (e: Event): void => {
      this._valueChangeEventInstance = e;
    };

    return props;
  }

  setAria(name: string, value: string): void {
    const attrName = getAriaName(name);
    addAttributes(
      this.$element() as unknown as dxElementWrapper,
      [{ name: attrName, value }],
    );
  }

  _init(): void {
    super._init();

    data(this.$element()[0], VALIDATION_TARGET, this);
    this.validationRequest = Callbacks();
    this.showValidationMessageTimeout = undefined;

    this._valueChangeAction = this._createActionByOption('onValueChanged', {
      excludeValidators: ['disabled', 'readOnly'],
    });
  }

  _getDefaultOptions(): Record<string, unknown> {
    return extend(
      super._getDefaultOptions(),
      {
        validationMessageOffset: { h: 0, v: 0 },
        validationTooltipOptions: {},
      },
    ) as Record<string, unknown>;
  }

  _bindInnerWidgetOptions(innerWidget: Component, optionsContainer: string): void {
    const innerWidgetOptions = extend({}, innerWidget.option());
    const syncOptions = (): void => this._silent(optionsContainer, innerWidgetOptions);

    syncOptions();
    innerWidget.on('optionChanged', syncOptions);
  }

  _optionChanged(option: Option): void {
    const { name, value, previousValue } = option;

    if (name && this._getActionConfigs()[name] !== undefined) {
      this._addAction(name);
    }

    switch (name) {
      case 'value':
        if (value !== previousValue) {
          this.validationRequest.fire({
            value,
            editor: this,
          });
        }
        this._valueChangeAction?.({
          element: this.$element(),
          previousValue,
          value,
          event: this._valueChangeEventInstance,
        });
        this._valueChangeEventInstance = undefined;
        break;
      case 'onValueChanged':
        this._valueChangeAction = this._createActionByOption('onValueChanged', {
          excludeValidators: ['disabled', 'readOnly'],
        });
        break;
      case 'isValid':
      case 'validationError':
      case 'validationErrors':
      case 'validationStatus':
        this.option((ValidationEngine as unknown as ({ synchronizeValidationOptions }))
          .synchronizeValidationOptions(option, this.option()));
        break;
      default:
        break;
    }

    super._optionChanged(option);
  }

  reset(): void {
    const { value } = this._getDefaultOptions();
    this.option({ value });
  }

  _dispose(): void {
    super._dispose();

    data(this.element(), VALIDATION_TARGET, null);
    if (this.showValidationMessageTimeout) {
      clearTimeout(this.showValidationMessageTimeout);
    }
  }
}

const prevIsEditor = (OldEditor as unknown as { isEditor: (instance: Component) => boolean })
  .isEditor;
const newIsEditor = (instance): boolean => prevIsEditor(instance) || instance instanceof Editor;
(Editor as unknown as { isEditor: (instance: Component) => boolean }).isEditor = newIsEditor;
(OldEditor as unknown as { isEditor: (instance: Component) => boolean }).isEditor = newIsEditor;