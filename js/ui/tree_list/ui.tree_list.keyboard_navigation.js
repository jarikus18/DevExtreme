import core from './ui.tree_list.core';
import { keyboardNavigationModule } from '../grid_core/keyboard_navigation/module';
import { extend } from '../../core/utils/extend';

core.registerModule('keyboardNavigation', extend(true, {}, keyboardNavigationModule, {
    extenders: {
        controllers: {
            keyboardNavigation: {
                _leftRightKeysHandler: function(eventArgs, isEditing) {
                    const rowIndex = this.getVisibleRowIndex();
                    const dataController = this._dataController;

                    if(eventArgs.ctrl) {
                        const directionCode = this._getDirectionCodeByKey(eventArgs.keyName);
                        const key = dataController.getKeyByRowIndex(rowIndex);
                        if(directionCode === 'nextInRow') {
                            dataController.expandRow(key);
                        } else {
                            dataController.collapseRow(key);
                        }
                    } else {
                        return this.callBase.apply(this, arguments);
                    }
                }
            }
        }
    }
}));
