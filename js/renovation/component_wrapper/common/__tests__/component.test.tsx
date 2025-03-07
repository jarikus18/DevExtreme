/**
 * @jest-environment jsdom
 */
// import ko from 'knockout';
import variableWrapper from '../../../../core/utils/variable_wrapper';
// eslint-disable-next-line import/named
import renderer, { dxElementWrapper } from '../../../../core/renderer';
import './utils/test_components/empty';
import './utils/test_components/base';
import './utils/test_components/options';
import './utils/test_components/templated';
import './utils/test_components/non_templated';
import './utils/test_components/children';
import './utils/test_components/invalid';
import './utils/test_components/aria';
import {
  defaultEvent,
  emitKeyboard,
  KEY,
} from '../../../test_utils/events_mock';
import { setPublicElementWrapper } from '../../../../core/element';
import * as UpdatePropsImmutable from '../../utils/update_props_immutable';
import registerEvent from '../../../../events/core/event_registrator';
import { one } from '../../../../events';
import KeyboardProcessor from '../../../../events/core/keyboard_processor';

const fakeEventSingleton = new class {
  handlerCount = 0;

  add() { this.handlerCount += 1; }

  remove() { this.handlerCount -= 1; }
}();

registerEvent('dxFakeEvent', fakeEventSingleton);

const $ = renderer as (el: string | Element | dxElementWrapper) => dxElementWrapper & {
  dxEmptyTestWidget: any;
  dxTestWidget: any;
  dxInvalidTestWidget: any;
  dxOptionsTestWidget: any;
  dxTemplatedTestWidget: any;
  dxNonTemplatedTestWidget: any;
  dxChildrenTestWidget: any;
  dxAriaTestWidget: any;
};

beforeEach(() => {
  document.body.innerHTML = `
    <div id="components">
        <div id="component"></div>
    </div>
    `;
});

afterEach(() => {
  $('#components').empty();
  document.body.innerHTML = '';
});

describe('Misc cases', () => {
  it('empty component creation does not fail', () => {
    expect(() => $('#component').dxEmptyTestWidget({})).not.toThrow();
  });

  it('component creation does not fail if component does not have template', () => {
    expect(() => { $('#component').dxNonTemplatedTestWidget({}); }).not.toThrow();
  });

  it('on disposing should clean effects', () => {
    const subscribeEffect = jest.fn();
    const unsubscribeEffect = jest.fn();
    $('#component').dxTestWidget({
      subscribeEffect,
      unsubscribeEffect,
    });

    expect(subscribeEffect).toHaveBeenCalledTimes(1);
    expect(unsubscribeEffect).toHaveBeenCalledTimes(0);

    $('#components').empty();

    expect(subscribeEffect).toHaveBeenCalledTimes(1);
    expect(unsubscribeEffect).toHaveBeenCalledTimes(1);
  });

  it('on repaint should clean effects', () => {
    const subscribeEffect = jest.fn();
    const unsubscribeEffect = jest.fn();
    const instance = $('#component').dxTestWidget({
      subscribeEffect,
      unsubscribeEffect,
    }).dxTestWidget('instance');

    expect(subscribeEffect).toHaveBeenCalledTimes(1);
    expect(unsubscribeEffect).toHaveBeenCalledTimes(0);

    instance.repaint();

    expect(subscribeEffect).toHaveBeenCalledTimes(2);
    expect(unsubscribeEffect).toHaveBeenCalledTimes(1);
  });

  it('should not throw error on disposing nested widget when call "empty()" on parent node', () => {
    const $component = $('#component');

    $('<div>').appendTo($component).dxTemplatedTestWidget({});
    $component.dxTemplatedTestWidget({});

    expect(() => $('#components').empty()).not.toThrow();
  });

  it('should forward API calls to component', () => {
    $('#component').dxTestWidget({ text: 'check api' });
    const apiCallResult = $('#component').dxTestWidget('apiMethodCheck', '1', '2');

    expect(apiCallResult).toBe('check api - 1 - 2');
  });

  it('setAria pass aria prop to the widget', () => {
    const $component = $('#component');
    $component.dxAriaTestWidget();

    $component.dxAriaTestWidget('setAria', 'role', 'custom');

    expect($component.dxAriaTestWidget('getLastPassedProps')).toMatchObject({
      aria: { role: 'custom' },
    });
  });

  describe('API with Element type params/return type', () => {
    it('pass DOM node to if provided parameter is jQuery wrapper', () => {
      const element = document.createElement('div');
      const wrapper = $(element);

      $('#component').dxTestWidget({});

      const checkParam = $('#component').dxTestWidget('methodWithElementParam', wrapper);

      expect(checkParam.arg).toEqual(element);
    });

    it('leave param as is if it is not jQuery wrapper', () => {
      $('#component').dxTestWidget({});

      const checkParam = $('#component').dxTestWidget('methodWithElementParam', 15);

      expect(checkParam.arg).toEqual(15);
    });

    it('wraps return value with jQuery and gets public element', () => {
      const getPublicElement = jest.fn(($el) => $el.get(0));
      setPublicElementWrapper(getPublicElement);

      const element = document.createElement('div');

      $('#component').dxTestWidget({});

      const checkParam = $('#component').dxTestWidget('methodReturnElement', element);

      expect(checkParam).toEqual(element);

      expect(getPublicElement).toHaveBeenCalledTimes(1);
      expect(getPublicElement).toHaveBeenNthCalledWith(1, $(element));
    });
  });
});

describe('Widget\'s container manipulations', () => {
  describe('classes', () => {
    it('should add widget class', () => {
      $('#component').dxTestWidget({});

      expect($('#component')[0].className).toBe('dx-test-widget');
    });

    it('should save container initial classes', () => {
      $('#component').addClass('test-class');
      $('#component').addClass('dx-test-class');
      $('#component').dxTestWidget({});
      $('#component').addClass('runtime-added-class');

      expect($('#component')[0].className).toBe('dx-test-widget test-class dx-test-class runtime-added-class');

      $('#component').dxTestWidget('repaint');
      expect($('#component')[0].className).toBe('dx-test-widget test-class dx-test-class');
    });

    it('should save classes, added in runtime', () => {
      $('#component').dxTestWidget({});
      $('#component').addClass('test-class');
      $('#component').addClass('dx-test-class');

      expect($('#component')[0].className).toBe('dx-test-widget test-class dx-test-class');

      $('#component').dxTestWidget('instance').option('text', 'updated');
      expect($('#component')[0].className).toBe('dx-test-widget test-class dx-test-class');
    });

    it('should allow to remove initial classes', () => {
      $('#component').addClass('test-class');
      $('#component').addClass('dx-test-class');
      $('#component').dxTestWidget({});

      $('#component').removeClass('dx-test-class');

      $('#component').dxTestWidget('instance').option('text', 'updated');
      expect($('#component')[0].className).toBe('dx-test-widget test-class');
    });

    it('should allow to remove added classes', () => {
      $('#component').dxTestWidget({});
      $('#component').addClass('test-class');
      $('#component').addClass('dx-test-class');

      $('#component').removeClass('dx-test-class');

      $('#component').dxTestWidget('instance').option('text', 'updated');
      expect($('#component')[0].className).toBe('dx-test-widget test-class');
    });

    it('should allow to switch widget classes', () => {
      $('#component').dxTestWidget({});
      $('#component').addClass('test-class');
      $('#component').addClass('dx-test-class');

      $('#component').removeClass('dx-test-widget');
      $('#component').dxTestWidget('instance').option('text', 'updated_1');
      expect($('#component')[0].className).toBe('test-class dx-test-class');

      $('#component').addClass('dx-test-widget');
      $('#component').dxTestWidget('instance').option('text', 'updated_2');
      expect($('#component')[0].className).toBe('test-class dx-test-class dx-test-widget');
    });
  });

  it('repaint redraws component only one time', () => {
    $('#component').css('width', '123px');
    $('#component').css('height', '456px');
    $('#component').addClass('custom-css-class');

    const subscribeEffect = jest.fn();
    $('#component').dxTestWidget({
      subscribeEffect,
    });

    $('#component').dxTestWidget('repaint');

    expect(subscribeEffect).toHaveBeenCalledTimes(2);

    expect(subscribeEffect.mock.calls[1][0]).toMatchObject({
      className: 'custom-css-class',
      style: { width: '123px', height: '456px' },
    });
  });

  it('component\'s root replaces widget\'s container', () => {
    $('#component').dxTestWidget({});

    expect($('.dx-test-widget')[0]).toBe($('#component')[0]);
  });

  it('component\'s root is widget\'s container after repaint', () => {
    $('#component').dxTestWidget({});
    $('#component').dxTestWidget('repaint');

    expect($('.dx-test-widget')[0]).toBe($('#component')[0]);
  });

  it('component\'s root is widget\'s container after render in detached container', () => {
    const $container = $('#component');
    const parent = $container.parent('');
    $container.remove($container);
    $container.dxTestWidget({ text: 'test' });

    $container.appendTo(parent);

    expect($('.dx-test-widget')[0]).not.toBe(undefined);
    expect($('.dx-test-widget')[0]).toBe($('#component')[0]);
  });

  it('component\'s root is widget\'s container after render in detached container and repaint', () => {
    const $container = $('#component');
    const parent = $container.parent('');
    $container.remove($container);
    $container.dxTestWidget({ text: 'test' });

    $container.appendTo(parent);
    $container.dxTestWidget('repaint');

    expect($('.dx-test-widget')[0]).not.toBe(undefined);
    expect($('.dx-test-widget')[0]).toBe($('#component')[0]);
  });

  it('html tree is correct after repaint detached component', () => {
    const $container = $('#component');
    const parent = $container.parent('');
    $container.remove($container);
    $container.dxTestWidget({ text: 'test' });

    $container.appendTo(parent);
    $container.dxTestWidget('repaint');
    $container.detach();
    $container.dxTestWidget('repaint');
    $container.appendTo(parent);
    $container.dxTestWidget('repaint');

    expect($('.dx-test-widget')[0]).not.toBe(undefined);
    expect($('.dx-test-widget')[0]).toBe($('#component')[0]);
  });

  it('pass custom class and attributes (with id) as props on first render', () => {
    $('#component').attr('id', 'my-id');
    $('#my-id').addClass('custom-css-class');
    $('#my-id').addClass('dx-custom-css-class');
    $('#my-id').attr('data-custom-attr', 'attr-value');

    $('#my-id').dxTestWidget({});

    expect($('#my-id').dxTestWidget('getLastPassedProps')).toMatchObject({
      id: 'my-id',
      className: 'custom-css-class dx-custom-css-class',
      class: '',
      'data-custom-attr': 'attr-value',
    });
  });

  it('pass custom attributes with empty value (hidden, text) as props on first render', () => {
    $('#component').attr('id', 'my-id');
    $('#my-id').attr('hidden', '');
    $('#my-id').attr('text', '');

    $('#my-id').dxTestWidget({});

    expect($('#my-id').dxTestWidget('getLastPassedProps')).toMatchObject({
      id: 'my-id',
      hidden: true,
      text: '',
    });
  });

  it('keep passing custom class and attributes (with id) props on repaint', () => {
    $('#component').attr('id', 'my-id');
    $('#my-id').addClass('custom-css-class');
    $('#my-id').addClass('dx-custom-css-class');
    $('#my-id').attr('data-custom-attr', 'attr-value');
    $('#my-id').dxTestWidget({});

    $('#my-id').dxTestWidget('repaint');

    expect($('#my-id').dxTestWidget('getLastPassedProps')).toMatchObject({
      id: 'my-id',
      className: 'custom-css-class dx-custom-css-class',
      class: '',
      'data-custom-attr': 'attr-value',
    });
  });

  it('should convert elementAttr.style string to the cssText prop', () => {
    const instance = $('#component')
      .dxTestWidget({ elementAttr: { style: 'background-color: red;' } })
      .dxTestWidget('instance');

    expect(instance._viewRef.current.props.cssText).toStrictEqual('background-color: red;');
  });

  it('widget does not show className option', () => {
    $('#component').addClass('custom-css-class');

    $('#component').dxTestWidget({});

    expect($('#component').dxTestWidget('option')).not.toHaveProperty('className');
  });

  it('replace id on container with id from elementAttr option', () => {
    $('#component').attr('id', 'my-id');

    $('#my-id').dxTestWidget({ elementAttr: { id: 'attr-id' } });

    expect($('#attr-id').dxTestWidget('getLastReceivedProps').id).toBe('attr-id');
  });

  it('merge unique css classes from elementAttr option with container class', () => {
    $('#component').addClass('custom-css-class attr-class');

    $('#component').dxTestWidget({ elementAttr: { class: 'attr-css-class attr-class' } });

    const { className } = $('#component').dxTestWidget('getLastReceivedProps');

    expect(className).toBe('custom-css-class attr-class attr-css-class');
  });

  it('keep elementAttr option untouched', () => {
    $('component').addClass('custom-css-class attr-class');
    $('#component').attr('data-custom-attr', 'attr-value');

    $('#component').dxTestWidget({ elementAttr: { id: 'attr-id', class: 'attr-css-class attr-class' } });

    expect($('#attr-id').dxTestWidget('option').elementAttr).toEqual({ id: 'attr-id', class: 'attr-css-class attr-class' });
  });

  it('pass style as key_value pair to props', () => {
    $('#component').css('width', '123.5px');
    $('#component').css('height', '456.6px');

    $('#component').dxTestWidget({});

    expect($('#component').dxTestWidget('getLastReceivedProps').style).toEqual({
      width: '123.5px',
      height: '456.6px',
    });
  });

  it('pass updated style on repaint', () => {
    $('#component').css('width', '123.5px');
    $('#component').css('height', '456.6px');

    $('#component').dxTestWidget({});

    $('#component').css('width', '23.5px');
    $('#component').css('height', '56.6px');
    $('#component').css('display', 'inline');

    $('#component').dxTestWidget('repaint');

    expect($('#component').dxTestWidget('getLastReceivedProps').style).toEqual({
      width: '23.5px',
      height: '56.6px',
      display: 'inline',
    });
  });

  it('component container should not change its position in parent container', () => {
    $('#components').append($('<div>')).prepend($('<div>'));

    $('#component').dxTestWidget({});

    expect($('#components').children().get(1)).toBe($('#component').get(0));
  });

  it('component container should not change its position after recreating', () => {
    /* This test is also relevant when the component is used in <React.StrictMode> */
    const instance = $('#component').dxTestWidget({}).dxTestWidget('instance');

    $('#components').append($('<div>')).prepend($('<div>'));

    instance.dispose();
    instance._initMarkup();

    expect($('#components').children().get(1)).toBe($('#component').get(0));
  });

  it('component container should not change its position after repaint', () => {
    const instance = $('#component').dxTestWidget({}).dxTestWidget('instance');

    $('#components').append($('<div>')).prepend($('<div>'));

    instance.repaint();

    expect($('#components').children().get(1)).toBe($('#component').get(0));
  });

  it('should be rendered not in "div" container', () => {
    document.body.innerHTML = `
      <div id="components">
          <a id="component"></a>
      </div>
      `;

    expect(() => $('#component').dxTestWidget({})).not.toThrow();
    expect($('#component')[0].nodeName.toLowerCase()).toBe('a');
  });
});

describe('option', () => {
  afterEach(() => {
    variableWrapper.resetInjection();
  });

  it('should return default props of component', () => {
    $('#component').dxOptionsTestWidget({});

    expect($('#component').dxOptionsTestWidget('option').text).toBe('default text');
  });

  it('should patch options without freezing', () => {
    $('#component').dxOptionsTestWidget({});
    expect(Object.isFrozen($('#component')
      .dxOptionsTestWidget('instance')._patchOptionValues({ objectProp: undefined }).objectProp)).toBe(false);
  });

  it('should copy default props of component (not by reference)', () => {
    document.body.innerHTML = `
      <div id="components">
          <div id="component1"></div>
          <div id="component2"></div>
      </div>
      `;

    $('#component1').dxOptionsTestWidget({});
    $('#component2').dxOptionsTestWidget({});

    const objectProp1 = $('#component1').dxOptionsTestWidget('option').objectProp;
    const objectProp2 = $('#component2').dxOptionsTestWidget('option').objectProp;

    expect(objectProp1).not.toBe(objectProp2);
  });

  it('nested option changed', () => {
    const component = $('#component').dxOptionsTestWidget({}).dxOptionsTestWidget('instance');
    expect(component.getLastReceivedProps().nestedObject.nestedProp).toBe('default value');
    const { nestedObject } = component.getLastReceivedProps();
    const spyUpdatePropsImmutable = jest.spyOn(UpdatePropsImmutable, 'updatePropsImmutable');

    component.option('nestedObject.nestedProp', 'new value');
    expect(spyUpdatePropsImmutable).toHaveBeenCalledWith(
      // eslint-disable-next-line no-underscore-dangle
      component._props,
      component.option(),
      'nestedObject',
      'nestedObject.nestedProp',
    );

    expect(component.getLastReceivedProps().nestedObject).not.toBe(nestedObject);
    expect(component.getLastReceivedProps().nestedObject.nestedProp).toBe('new value');
  });

  it('should return default value of TwoWay prop', () => {
    $('#component').dxOptionsTestWidget({});

    expect($('#component').dxOptionsTestWidget('option').twoWayProp).toBe(1);
  });

  it('should return updated value of TwoWay prop', () => {
    $('#component').dxOptionsTestWidget({});

    $('#component').dxOptionsTestWidget('updateTwoWayPropCheck');

    expect($('#component').dxOptionsTestWidget('option').twoWayProp).toBe(2);
  });

  it('fires optionChanged on TwoWay prop change', () => {
    const optionChanged = jest.fn();
    $('#component').dxOptionsTestWidget({
      onOptionChanged: optionChanged,
    });

    $('#component').dxOptionsTestWidget('updateTwoWayPropCheck');

    expect(optionChanged).toHaveBeenCalledTimes(1);
    expect(optionChanged.mock.calls[0][0]).toEqual({
      fullName: 'twoWayProp',
      name: 'twoWayProp',
      previousValue: 1,
      value: 2,
      element: $('#component').get(0),
      component: $('#component').dxOptionsTestWidget('instance'),
    });
  });

  it('convert `undefined` to `null` or `default value`', () => {
    $('#component').dxOptionsTestWidget({
      oneWayWithValue: 15,
      oneWayWithoutValue: 15,
      oneWayNullWithValue: 15,
      twoWayWithValue: '15',
      twoWayNullWithValue: '15',
    });

    $('#component').dxOptionsTestWidget({
      oneWayWithValue: undefined,
      oneWayWithoutValue: undefined,
      oneWayNullWithValue: undefined,
      twoWayWithValue: undefined,
      twoWayNullWithValue: undefined,
    });

    expect($('#component').dxOptionsTestWidget('getLastPassedProps')).toMatchObject({
      oneWayWithValue: 10,
      oneWayWithoutValue: undefined,
      oneWayNullWithValue: null,
      twoWayWithValue: '10',
      twoWayNullWithValue: null,
    });

    expect($('#component').dxOptionsTestWidget('option')).toMatchObject({
      oneWayWithValue: undefined,
      oneWayWithoutValue: undefined,
      oneWayNullWithValue: undefined,
      twoWayWithValue: undefined,
      twoWayNullWithValue: undefined,
    });
  });

  it('set to undefined should fall back to default value including default option rules', () => {
    $('#component').dxOptionsTestWidget({
      oneWayWithDefaultRule: 10,
      twoWayWithDefaultRule: 10,
      oneWayWithValueDefaultRule: 10,
    });

    $('#component').dxOptionsTestWidget({
      oneWayWithDefaultRule: undefined,
      oneWayWithValueDefaultRule: undefined,
      twoWayWithDefaultRule: undefined,
    });

    expect($('#component').dxOptionsTestWidget('getLastPassedProps')).toMatchObject({
      oneWayWithDefaultRule: 15,
      oneWayWithValueDefaultRule: 15,
      twoWayWithDefaultRule: 15,
    });
  });

  describe('Options with Element type', () => {
    it('pass DOM node to component if provided option is jQuery wrapper', () => {
      const element = document.createElement('div');
      const wrapper = $(element);

      $('#component').dxOptionsTestWidget({
        propWithElement: wrapper,
      });

      expect($('#component').dxOptionsTestWidget('getLastPassedProps').propWithElement).toEqual(element);
    });

    it('leave option as is if it is not jQuery wrapper', () => {
      $('#component').dxOptionsTestWidget({
        propWithElement: 15,
      });

      expect($('#component').dxOptionsTestWidget('getLastPassedProps').propWithElement).toEqual(15);
    });
  });

  it('should return null for template option if it is not set', () => {
    const widget = $('#component').dxOptionsTestWidget({}).dxOptionsTestWidget('instance');

    expect(widget.option('contentTemplate')).toBe(null);
  });

  it('should not pass excessive options to props', () => {
    const mockFunction = () => { };
    const options = {
      text: 'some text',
      twoWayProp: 15,
      twoWayPropChange: mockFunction,
      excessiveOption: { isExcessive: true },
    };
    const { excessiveOption, ...props } = options;

    $('#component').dxOptionsTestWidget(options);

    expect($('#component').dxOptionsTestWidget('getLastPassedProps')).toMatchObject(props);
    expect($('#component').dxOptionsTestWidget('option')).toMatchObject(options);
  });

  it('should still pass elementAttr to props', () => {
    const mockFunction = () => { };
    const elementStyle = { backgroundColor: 'red' };
    const options = {
      text: 'some text',
      twoWayProp: 15,
      twoWayPropChange: mockFunction,
      elementAttr: { style: elementStyle },
    };
    const { elementAttr, ...props } = options;

    $('#component').dxOptionsTestWidget(options);

    expect($('#component').dxOptionsTestWidget('getLastPassedProps')).toMatchObject({
      ...props,
      style: elementStyle,
    });
    expect($('#component').dxOptionsTestWidget('option')).toMatchObject(options);
  });

  it('should remap "onKeyboardHandled" event to "onKeyDown"', () => {
    const mockFunction = jest.fn();
    const options = {
      onKeyboardHandled: mockFunction,
    };

    $('#component').dxTestWidget(options);

    emitKeyboard(KEY.space);
    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(mockFunction).toHaveBeenCalledWith({
      originalEvent: defaultEvent, keyName: KEY.space, which: KEY.space,
    });
  });

  it('updates props if it is called on onInitialized handler (T1057680)', () => {
    const $component = $('#component');
    const options = {
      text: 'new text',
    };
    $component.dxTestWidget({
      onInitialized: (e) => {
        e.component.option(options);
      },
    });

    expect($component.dxTestWidget('getLastPassedProps')).toMatchObject(options);
  });

  it('unwrap knockout observable props (T1117147)', () => {
    function koObservableFake() { return 'value'; }
    variableWrapper.inject({
      unwrap: (v) => (v === koObservableFake ? v() : v),
    });
    const options = {
      text: koObservableFake,
    };
    $('#component').dxOptionsTestWidget(options);
    expect($('#component').dxOptionsTestWidget('getLastPassedProps')).toMatchObject({
      text: 'value',
    });
  });
});

describe('templates and slots', () => {
  it('should ignore default templates', () => {
    $('#component').dxTemplatedTestWidget({ template: 'test' });
    let $template = $('#component').find('.templates-root');
    expect($template.text()).toBe('test');

    $('#component').dxTemplatedTestWidget({ template: 'defaultTemplateName1' });
    $template = $('#component').find('.templates-root');
    expect($template.length).toBe(0);

    $('#component').dxTemplatedTestWidget({ template: 'defaultTemplateName2' });
    $template = $('#component').find('.templates-root');
    expect($template.length).toBe(0);
  });

  it('should render custom template with render function that returns dom node', () => {
    $('#component').dxTemplatedTestWidget({
      template: 'test',
      integrationOptions: {
        templates: {
          test: {
            render: () => $('<span>')
              .addClass('dx-template-wrapper')
              .text('template text')[0],
          },
        },
      },
    });

    const $template = $('#component').find('.dx-template-wrapper');
    expect($template.text()).toBe('template text');
  });

  it('should render custom template when component has attibute with template name', () => {
    $('#component').attr('template', 'test');
    $('#component').dxTemplatedTestWidget({
      template: 'test',
      integrationOptions: {
        templates: {
          test: {
            render: () => $('<span>')
              .addClass('dx-template-wrapper')
              .text('template text')[0],
          },
        },
      },
    });

    $('#component').removeAttr('template');

    const $template = $('#component').find('.dx-template-wrapper');
    expect($template.text()).toBe('template text');
  });

  it('should unsubscribe from all events for nested jquery components when disposing parent component', () => {
    $('#component').dxTemplatedTestWidget({
      template(_: never, element: Element) {
        one(element, 'dxFakeEvent', () => { });
        $(element).html('<span>Template content</span>');
      },
    });

    $('#components').empty();

    expect(fakeEventSingleton.handlerCount).toBe(0);
  });

  it('template can be rendered without data passed', () => {
    const templateMarkup = '<span>Template content</span>';
    $('#component').dxTemplatedTestWidget({
      templateWithoutData() {
        return templateMarkup;
      },
    });

    expect($('#component').children()[0].innerHTML).toBe(templateMarkup);
  });

  it('pass anonymous template content as children', () => {
    $('#component').html('<span>Default slot</span>');

    $('#component').dxTemplatedTestWidget({});

    expect($('#component').children('').length).toBe(1);
    expect($('#component')[0].innerHTML).toBe('<span>Default slot</span>');
  });

  it('preserve anonymous template content element', () => {
    const element = $('<span>').html('Default slot');
    $('#component').append(element);

    $('#component').dxTemplatedTestWidget({});

    expect($('#component').children('')[0]).toBe(element[0]);
  });

  it('pass updated anonymous content on repaint', () => {
    const slotContent = $('<span>').html('Default slot');
    $('#component').append(slotContent);

    $('#component').dxTemplatedTestWidget({});
    slotContent.html('Update slot');

    $('#component').dxTemplatedTestWidget('repaint');

    expect($('#component')[0].innerHTML).toBe('<span>Update slot</span>');
  });

  it('change option when anonymous template exists', () => {
    const slotContent = $('<span>').html('Default slot');
    $('#component').append(slotContent);
    $('#component').dxTemplatedTestWidget({});

    expect(() => $('#component')
      .dxTemplatedTestWidget('instance')
      .option('someOption', 'newValue')).not.toThrow();
  });

  describe('template function parameters', () => {
    it('template without index', () => {
      const template = jest.fn();

      $('#component').dxTemplatedTestWidget({
        template,
      });

      const templateRoot = $('#component').children('.templates-root')[0];

      expect(template).toHaveBeenCalledTimes(1);
      expect(template.mock.calls[0]).toEqual([{ simpleTemplate: 'data' }, templateRoot]);
    });

    it('template with index', () => {
      const template = jest.fn();
      const indexedTemplatePayload = { value: 'test' };

      $('#component').dxTemplatedTestWidget({
        indexedTemplate: template,
        indexedTemplatePayload,
        index: 1,
      });

      const templateRoot = $('#component').children('.templates-root')[0];

      expect(template).toHaveBeenCalledTimes(1);
      expect(template.mock.calls[0]).toEqual([indexedTemplatePayload, 1, templateRoot]);
    });

    it('wraps DOM nodes in "data" param with jQuery and gets public element', () => {
      const getPublicElement = jest.fn(($el) => $el.get(0));
      setPublicElementWrapper(getPublicElement);

      const template = jest.fn();
      const param1 = document.createElement('div');
      const param2 = { some: 'object' };

      $('#component').dxTemplatedTestWidget({
        elementTemplate: template,
        elementTemplatePayload: { nodeParam: param1, nonNodeParam: param2 },
      });

      expect(template).toHaveBeenCalledTimes(1);
      expect(template.mock.calls[0][0]).toMatchObject({
        nodeParam: param1, nonNodeParam: param2,
      });

      const templateRoot = $('#component').children('.templates-root')[0];

      expect(getPublicElement).toHaveBeenNthCalledWith(2, $(param1));
      expect(getPublicElement).toHaveBeenNthCalledWith(1, $(templateRoot));
    });

    it('Tempate\'s data can have null/undefined values', () => {
      const getPublicElement = jest.fn(($el) => $el.get(0));
      setPublicElementWrapper(getPublicElement);

      const template = jest.fn();

      $('#component').dxTemplatedTestWidget({
        elementTemplate: template,
        elementTemplatePayload: { nullParam: null, undefinedParam: undefined },
      });

      const templateRoot = $('#component').children('.templates-root')[0];
      expect(template.mock.calls[0]).toEqual([{
        nullParam: null,
        undefinedParam: undefined,
      }, templateRoot]);
    });
  });

  it('insert template content to templates root', () => {
    $('#component').dxTemplatedTestWidget({
      template(_data, element) {
        $(element).html('<span>Template content</span>');
      },
    });

    const templateRoot = $('#component').children('.templates-root')[0];

    expect(templateRoot.innerHTML).toBe('<span>Template content</span>');
  });

  it('remove old template content between renders', () => {
    $('#component').dxTemplatedTestWidget({
      template(data, element) {
        $(element).append(`<span>Template - ${data.simpleTemplate}</span>` as any);
      },
    });
    const templateRoot = $('#component').children('.templates-root')[0];

    $('#component').dxTemplatedTestWidget({
      text: 'new data',
    });

    expect(templateRoot.innerHTML).toBe('<span>Template - new data</span>');
  });

  it('correctly change template at runtime', () => {
    const template = () => {
      const div = $('<div>');
      div.append('first custom template' as any);
      return div;
    };

    const templateNew = () => {
      const div = $('<div>');
      div.append('second custom template' as any);
      return div;
    };
    $('#component').dxTemplatedTestWidget({
      template,
    });
    const templateRoot = $('#component').children('.templates-root')[0];

    $('#component').dxTemplatedTestWidget({
      template: templateNew,
    });

    expect(templateRoot.innerHTML).toBe('<div>second custom template</div>');
  });

  it('should not replace root with template if it returns .dx-template-wrapper node', () => {
    const template = $('<div>').addClass('dx-template-wrapper').text('TemplateContent');
    $('#component').dxTemplatedTestWidget({
      template() {
        return template;
      },
    });
    const root = $('#component').children('.templates-root')[0];

    expect($(root.lastChild as Element)[0]).toBe(template[0]);
  });

  it('should render content in right order if children placed between other nodes', () => {
    const slotContent = $('<span>').html('Default slot');
    $('#component').append(slotContent);
    const slotBefore = $('<span>').html('Additional slot before').insertBefore(slotContent);
    const slotAfter = $('<span>').html('Additional slot after').insertAfter(slotContent);
    $('#component').dxChildrenTestWidget({});

    const children = $('#component')[0].childNodes;
    expect(children[2]).toBe(slotBefore[0]);
    expect(children[3]).toBe(slotContent[0]);
    expect(children[4]).toBe(slotAfter[0]);
  });

  it('should not fail if template returned parent node', () => {
    const template = (_: never, element: HTMLElement) => $(element)
      .append($('<span>').text('text'))
      .addClass('modified_container');

    expect(() => $('#component').dxTemplatedTestWidget({ template })).not.toThrow();
  });

  it('should have default templates for jQuery', () => {
    const instance = $('#component')
      .dxTemplatedTestWidget()
      .dxTemplatedTestWidget('instance');

    const templateNames = instance._propsInfo.templates;
    const defaultTemplates = instance._templatesInfo;
    const innerOptions = instance._props;
    const publicOptions = instance.option();

    templateNames.forEach((name) => {
      expect(innerOptions[name]).toBe(defaultTemplates[name]);
      expect(publicOptions[name]).toBe(null);
    });
  });

  it('should remove content after template removed', () => {
    const template = () => $('<div>');

    $('#component').dxTemplatedTestWidget({
      template,
    });

    expect($('#component').children('.templates-root').length).toBe(1);

    $('#component').dxTemplatedTestWidget({
      template: null,
    });
    expect($('#component').children('.templates-root').length).toBe(0);
  });

  it('should not rerender the same template', () => {
    const render = jest.fn();
    const template = {
      render,
    };

    const instance = $('#component').dxTemplatedTestWidget({
      template,
    }).dxTemplatedTestWidget('instance');

    expect(render).toHaveBeenCalledTimes(1);

    const widgetTemplate = instance.option('template');
    instance.option('template', widgetTemplate);

    expect(render).toHaveBeenCalledTimes(1);
  });

  it('should not re-render template if new data shadow equal', () => {
    const template = jest.fn();

    const instance = $('#component').dxTemplatedTestWidget({
      elementTemplate: template,
      elementTemplatePayload: { value: 'test' },
    }).dxTemplatedTestWidget('instance');

    expect(template).toHaveBeenCalledTimes(1);

    instance.option('elementTemplatePayload', { value: 'test' });
    expect(template).toHaveBeenCalledTimes(1);

    instance.option('elementTemplatePayload', { value: 'newValue' });
    expect(template).toHaveBeenCalledTimes(2);
  });

  it('should not re-render template with custom equal is used', () => {
    const template = jest.fn();
    const isEqual1 = jest.fn().mockReturnValue(true);
    const isEqual2 = jest.fn().mockReturnValue(false);

    const instance = $('#component').dxTemplatedTestWidget({
      elementTemplate: template,
      elementTemplatePayload: { value: 'test' },
    }).dxTemplatedTestWidget('instance');

    expect(template).toHaveBeenCalledTimes(1);

    instance.option('elementTemplatePayload', { value: 'test', isEqual: isEqual1 });
    expect(isEqual1).toHaveBeenCalledTimes(1);
    expect(template).toHaveBeenCalledTimes(1);

    isEqual1.mockReset();
    instance.option('elementTemplatePayload', { value: 'newValue', isEqual: isEqual2 });
    expect(isEqual1).not.toHaveBeenCalled();
    expect(isEqual2).toHaveBeenCalledTimes(1);
    expect(template).toHaveBeenCalledTimes(2);
  });

  it('should not re-render template if non-related option changed', () => {
    const template = jest.fn();

    const instance = $('#component').dxTemplatedTestWidget({
      elementTemplate: template,
      elementTemplatePayload: { value: 'test' },
    }).dxTemplatedTestWidget('instance');

    expect(template).toHaveBeenCalledTimes(1);

    instance.option('text', { value: 'test' });
    expect(template).toHaveBeenCalledTimes(1);
  });

  it('should rerender if index changed', () => {
    const template = jest.fn();
    const indexedTemplatePayload = { value: 'test' };

    const instance = $('#component').dxTemplatedTestWidget({
      indexedTemplate: template,
      indexedTemplatePayload,
      index: 123,
    }).dxTemplatedTestWidget('instance');

    expect(template).toHaveBeenCalledTimes(1);
    expect(template.mock.calls[0][1]).toEqual(123);

    instance.option({
      indexedTemplatePayload,
      index: 456,
    });
    expect(template).toHaveBeenCalledTimes(2);
    expect(template.mock.calls[1][1]).toEqual(456);
  });
});

describe('events/actions', () => {
  it('wraps event props with Actions with declared actionConfig', () => {
    const onEventProp = jest.fn();
    $('#component').dxTestWidget({
      onEventProp,
      beforeActionExecute: (_, action, actionConfig) => action(actionConfig),
    });

    $('#component').dxTestWidget('eventPropCheck', 'payload');

    expect($('#component').dxTestWidget('option').onEventProp).toBe(onEventProp);
    expect(onEventProp.mock.calls[0][0].someConfigs).toBe('action-config');
    expect(onEventProp.mock.calls[1][0]).toEqual({
      actionValue: 'payload',
      component: $('#component').dxTestWidget('instance'),
      element: $('#component').get(0),
    });
  });

  it('wraps DOM nodes in event args with jQuery and gets public element', () => {
    const getPublicElement = jest.fn(($el) => $el.get(0));
    setPublicElementWrapper(getPublicElement);

    const onEventProp = jest.fn();
    const element1 = document.createElement('div');
    const element2 = document.createElement('div');
    const element3 = { some: 'object' };
    const element4 = null;
    $('#component').dxTestWidget({
      onEventProp,
    });

    $('#component').dxTestWidget('eventPropCheck', {
      eventElement: element1,
      wrappedField: element2,
      nonWrappedField: element3,
      emptyField: element4,
    });

    expect(onEventProp.mock.calls[0][0]).toMatchObject({
      eventElement: element1,
      wrappedField: element2,
      nonWrappedField: element3,
      emptyField: element4,
      element: $('#component').get(0),
    });

    expect(getPublicElement).toHaveBeenCalledTimes(3);
    expect(getPublicElement).toHaveBeenNthCalledWith(1, $(element1));
    expect(getPublicElement).toHaveBeenNthCalledWith(2, $(element2));
    expect(getPublicElement).toHaveBeenNthCalledWith(3, $('#component'));
  });

  it('re-wraps event props if it is changed', () => {
    const onEventProp1 = jest.fn();
    const onEventProp2 = jest.fn();
    $('#component').dxTestWidget({
      onEventProp: onEventProp1,
    });

    $('#component').dxTestWidget({
      onEventProp: onEventProp2,
    });

    $('#component').dxTestWidget('eventPropCheck', 'payload');

    expect($('#component').dxTestWidget('option').onEventProp).toBe(onEventProp2);
    expect(onEventProp1).toHaveBeenCalledTimes(0);
    expect(onEventProp2).toHaveBeenCalledTimes(1);
    expect(onEventProp2.mock.calls[0][0]).toEqual({
      actionValue: 'payload',
      component: $('#component').dxTestWidget('instance'),
      element: $('#component').get(0),
    });
  });
});

describe('registerKeyHandler', () => {
  it('"_supportedKeys" internal method should merge custom and default handlers', () => {
    $('#component').dxTestWidget({});

    const instance = $('#component').dxTestWidget('instance');

    instance.registerKeyHandler('space', () => 'custom space handler');
    instance.registerKeyHandler('enter', () => 'custom enter handler');

    const supportedKeys = instance._supportedKeys();

    expect(supportedKeys.enter()).toBe('custom enter handler');
    expect(supportedKeys.space()).toBe('custom space handler');
    expect(supportedKeys.arrowUp()).toBe('default arrow up handler');
  });

  it('should throw exception if the component has key handlers but does not have keyDown event', () => {
    expect(() => $('#component').dxInvalidTestWidget({})).toThrow(
      'Component\'s declaration must have \'keyDown\' method.',
    );
  });

  it('Default key handlers should call keyDown method', () => {
    const mockFunction = jest.fn();
    const instance = $('#component').dxTestWidget({}).dxTestWidget('instance');
    const supportedKeys = instance._supportedKeys();

    instance._viewRef.current.keyDown = mockFunction;
    supportedKeys.space(defaultEvent);

    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(mockFunction).toHaveBeenCalledWith(
      (KeyboardProcessor as any).createKeyDownOptions(defaultEvent),
    );
  });

  it('call custom handler only', () => {
    const customHandler = jest.fn();
    const propHandler = jest.fn();
    $('#component').dxTestWidget({
      onKeyDown: propHandler,
    });
    const instance = $('#component').dxTestWidget('instance');

    instance.registerKeyHandler('space', customHandler);

    emitKeyboard(KEY.space);

    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(customHandler).toHaveBeenCalledWith(defaultEvent,
      { originalEvent: defaultEvent, keyName: KEY.space, which: KEY.space });

    expect(propHandler).toHaveBeenCalledTimes(0);
  });

  it('call both handlers if custom handler returns something', () => {
    const customHandler = jest.fn(() => true);
    const propHandler = jest.fn();
    $('#component').dxTestWidget({
      onKeyDown: propHandler,
    });
    const instance = $('#component').dxTestWidget('instance');

    instance.registerKeyHandler('space', customHandler);

    emitKeyboard(KEY.space);

    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(customHandler).toHaveBeenCalledWith(defaultEvent,
      { originalEvent: defaultEvent, keyName: KEY.space, which: KEY.space });

    expect(propHandler).toHaveBeenCalledTimes(1);
    expect(propHandler).toHaveBeenCalledWith(defaultEvent,
      { originalEvent: defaultEvent, keyName: KEY.space, which: KEY.space });
  });

  it('do not call custom handler on another keyDown event', () => {
    const customHandler = jest.fn();
    const propHandler = jest.fn();
    $('#component').dxTestWidget({
      onKeyDown: propHandler,
    });
    const instance = $('#component').dxTestWidget('instance');

    instance.registerKeyHandler('space', customHandler);

    emitKeyboard(KEY.enter);

    expect(customHandler).toHaveBeenCalledTimes(0);

    expect(propHandler).toHaveBeenCalledTimes(1);
    expect(propHandler).toHaveBeenCalledWith(defaultEvent,
      { originalEvent: defaultEvent, keyName: KEY.enter, which: KEY.enter });
  });
});

describe('onContentReady', () => {
  it('should be raised on first render', () => {
    const contentReadyHandler = jest.fn();
    $('#component').dxTestWidget({
      onContentReady: contentReadyHandler,
    });
    const instance = $('#component').dxTestWidget('instance');

    expect(contentReadyHandler).toHaveBeenCalledTimes(1);
    expect(contentReadyHandler)
      .toHaveBeenCalledWith({ component: instance, element: instance.element() });
  });

  it('should be raised on appropriate option change on endUpdate', () => {
    const contentReadyHandler = jest.fn();
    $('#component').dxTestWidget({
      onContentReady: contentReadyHandler,
    });
    const instance = $('#component').dxTestWidget('instance');
    contentReadyHandler.mockReset();

    instance.beginUpdate();
    instance.option('width', 100);
    instance.option('height', 100);
    instance.endUpdate();

    expect(contentReadyHandler).toHaveBeenCalledTimes(1);
    expect(contentReadyHandler)
      .toHaveBeenCalledWith({ component: instance, element: instance.element() });
  });

  it('should not be raised on option change if it is not specified in getContentReadyOptions', () => {
    const contentReadyHandler = jest.fn();
    $('#component').dxTestWidget({
      onContentReady: contentReadyHandler,
    });
    const instance = $('#component').dxTestWidget('instance');
    contentReadyHandler.mockReset();

    instance.option('text', 'text');

    expect(contentReadyHandler).not.toHaveBeenCalled();
  });

  it('should be raised on repaint', () => {
    const contentReadyHandler = jest.fn();
    $('#component').dxTestWidget({
      onContentReady: contentReadyHandler,
    });
    const instance = $('#component').dxTestWidget('instance');
    contentReadyHandler.mockReset();

    instance.repaint();

    expect(contentReadyHandler).toHaveBeenCalledTimes(1);
    expect(contentReadyHandler)
      .toHaveBeenCalledWith({ component: instance, element: instance.element() });
  });

  it('should be raised on repaint if subscribe using on', () => {
    const contentReadyHandler = jest.fn();
    $('#component').dxTestWidget({});
    const instance = $('#component').dxTestWidget('instance');
    instance.on('contentReady', contentReadyHandler);

    instance.repaint();

    expect(contentReadyHandler).toHaveBeenCalledTimes(1);
    expect(contentReadyHandler)
      .toHaveBeenCalledWith({ component: instance, element: instance.element() });
  });
});
